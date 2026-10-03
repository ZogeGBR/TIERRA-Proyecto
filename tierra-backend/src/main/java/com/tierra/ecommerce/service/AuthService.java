package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.LoginRequest;
import com.tierra.ecommerce.dto.RegistroRequest;
import com.tierra.ecommerce.dto.UsuarioResponse;
import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.enums.RolUsuario;
import com.tierra.ecommerce.exception.CredencialesInvalidasException;
import com.tierra.ecommerce.exception.CuentaBloqueadaException;
import com.tierra.ecommerce.exception.CuentaDeshabilitadaException;
import com.tierra.ecommerce.exception.EmailYaRegistradoException;
import com.tierra.ecommerce.repository.UsuarioRepository;
import com.tierra.ecommerce.security.UsuarioAutenticado;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

// Alta de cuentas y verificación de credenciales.
//
// No toca la sesión: eso es responsabilidad del controller, que es el único
// que tiene acceso al request y al response. Acá sólo se decide si alguien
// es quien dice ser.
@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final int intentosMaximos;
    private final int bloqueoMinutos;

    public AuthService(UsuarioRepository usuarioRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       @Value("${auth.intentos-maximos:5}") int intentosMaximos,
                       @Value("${auth.bloqueo-minutos:15}") int bloqueoMinutos) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.intentosMaximos = intentosMaximos;
        this.bloqueoMinutos = bloqueoMinutos;
    }

    // ---------------------------------------------------------------
    // Registro
    // ---------------------------------------------------------------

    @Transactional
    public Usuario registrar(RegistroRequest request) {
        // El email ya viene normalizado desde el DTO; esto es una red por si
        // alguien llama al servicio desde otro lado.
        String email = normalizarEmail(request.email());

        // El UNIQUE de la base es la garantía real; esta consulta existe para
        // poder devolver un 409 entendible en vez de un error de restricción.
        if (usuarioRepository.findByEmail(email).isPresent()) {
            // Decir que el email ya existe filtra información: confirma qué
            // direcciones están registradas. Es inevitable acá — si no, la
            // persona no entiende por qué falla. La mitigación estándar es
            // responder siempre lo mismo y avisar por email, y eso necesita
            // el módulo de notificaciones (fase 3). Deuda consciente.
            throw new EmailYaRegistradoException("Ya existe una cuenta con ese email");
        }

        Usuario usuario = new Usuario();
        usuario.setNombre(request.nombre());
        usuario.setEmail(email);
        usuario.setPasswordHash(passwordEncoder.encode(request.password()));
        usuario.setTelefono(vacioComoNulo(request.telefono()));

        // El rol se fija acá y nunca se toma del request. Ver RegistroRequest.
        usuario.setRol(RolUsuario.CLIENTE);

        return usuarioRepository.save(usuario);
    }

    // ---------------------------------------------------------------
    // Login
    // ---------------------------------------------------------------

    public Authentication autenticar(LoginRequest request) {
        String email = normalizarEmail(request.email());

        try {
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.password()));
            reiniciarIntentos(email);
            return auth;

        } catch (LockedException ex) {
            // Spring verifica el estado de la cuenta ANTES de comparar la
            // contraseña, así que una cuenta bloqueada llega acá aunque la
            // contraseña sea correcta. No se cuenta como intento fallido:
            // sumar intentos sobre una cuenta ya bloqueada sólo alargaría el
            // bloqueo indefinidamente.
            throw new CuentaBloqueadaException(
                    "Demasiados intentos fallidos. Probá de nuevo en unos minutos.");

        } catch (DisabledException ex) {
            throw new CuentaDeshabilitadaException(
                    "Esta cuenta está deshabilitada. Escribinos si creés que es un error.");

        } catch (BadCredentialsException ex) {
            // Spring convierte UsernameNotFoundException en BadCredentials por
            // defecto, así que este bloque cubre los dos casos: contraseña mal
            // y email inexistente. El mensaje tiene que ser el mismo para
            // ambos, o se puede averiguar qué emails están registrados.
            registrarIntentoFallido(email);
            throw new CredencialesInvalidasException("Email o contraseña incorrectos");
        }
    }

    // El contador vive en la base y no en memoria para que sobreviva a los
    // reinicios: si se reiniciara con cada deploy, un atacante sólo tendría
    // que esperar al siguiente.
    //
    // Su límite: protege una cuenta contra muchos intentos, pero no contra un
    // atacante que prueba una contraseña común contra miles de cuentas. Esa
    // defensa es por IP y va en el proxy inverso (fase 6).
    // Sin @Transactional a propósito: se lo llama desde autenticar(), que está
    // en esta misma clase, y Spring no intercepta las llamadas internas — la
    // anotación quedaría ahí sin hacer nada, que es peor que no ponerla.
    // El save() del repositorio abre su propia transacción, que alcanza.
    // La consecuencia teórica es que dos intentos fallidos simultáneos podrían
    // contar como uno; con un contador de bloqueo es irrelevante.
    private void registrarIntentoFallido(String email) {
        Optional<Usuario> encontrado = usuarioRepository.findByEmail(email);
        // Si el email no existe no hay nada que contar, y el silencio es
        // deliberado: el tiempo de respuesta y el mensaje quedan iguales.
        if (encontrado.isEmpty()) {
            return;
        }
        Usuario usuario = encontrado.get();

        // Si el bloqueo anterior ya venció, el contador arranca de cero.
        // Sin esto queda en el máximo para siempre: la persona espera los
        // minutos, vuelve, se equivoca UNA vez y se bloquea de nuevo al
        // instante. El bloqueo tiene que castigar una racha de intentos, no
        // dejar la cuenta marcada.
        boolean bloqueoVencido = usuario.getBloqueadoHasta() != null
                && usuario.getBloqueadoHasta().isBefore(LocalDateTime.now());
        int previos = bloqueoVencido ? 0 : usuario.getIntentosFallidos();

        int intentos = previos + 1;
        usuario.setIntentosFallidos(intentos);
        usuario.setBloqueadoHasta(intentos >= intentosMaximos
                ? LocalDateTime.now().plusMinutes(bloqueoMinutos)
                : null);
        usuarioRepository.save(usuario);
    }

    private void reiniciarIntentos(String email) {
        usuarioRepository.findByEmail(email).ifPresent(usuario -> {
            if (usuario.getIntentosFallidos() != 0 || usuario.getBloqueadoHasta() != null) {
                usuario.setIntentosFallidos(0);
                usuario.setBloqueadoHasta(null);
                usuarioRepository.save(usuario);
            }
        });
    }

    // ---------------------------------------------------------------
    // Utilidades
    // ---------------------------------------------------------------

    // Minúsculas y sin espacios: el UNIQUE de PostgreSQL distingue mayúsculas,
    // así que sin normalizar, "Juan@tierra.com" y "juan@tierra.com" serían dos
    // cuentas distintas y el login fallaría según cómo se tipeara.
    public static String normalizarEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private static String vacioComoNulo(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        return valor;
    }

    public static UsuarioResponse aResponse(Usuario usuario) {
        return new UsuarioResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getEmail(),
                usuario.getRol());
    }

    public static UsuarioResponse aResponse(UsuarioAutenticado usuario) {
        return new UsuarioResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getUsername(),
                usuario.getRol());
    }
}

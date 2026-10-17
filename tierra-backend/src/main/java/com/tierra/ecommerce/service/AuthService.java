package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.LoginRequest;
import com.tierra.ecommerce.dto.UsuarioResponse;
import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.enums.RolUsuario;
import com.tierra.ecommerce.exception.CredencialesInvalidasException;
import com.tierra.ecommerce.exception.CuentaBloqueadaException;
import com.tierra.ecommerce.exception.CuentaDeshabilitadaException;
import com.tierra.ecommerce.repository.UsuarioRepository;
import com.tierra.ecommerce.security.UsuarioAutenticado;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

// Login con contraseña del EQUIPO (ADR 0005). Los clientes no tienen
// contraseña: entran con un código (CodigoAccesoService), y una cuenta de
// cliente nunca pasa por acá: UsuarioDetailsService la rechaza como si el
// email no existiera.
//
// Ya no hay alta de cuentas: el registro desapareció con el acceso por
// código, y los clientes se crean al comprar (tarea 9).
//
// No toca la sesión: eso es responsabilidad del controller, que es el único
// que tiene acceso al request y al response. Acá sólo se decide si alguien
// es quien dice ser.
@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final AuthenticationManager authenticationManager;
    private final int intentosMaximos;
    private final int bloqueoMinutos;

    public AuthService(UsuarioRepository usuarioRepository,
                       AuthenticationManager authenticationManager,
                       @Value("${auth.intentos-maximos:5}") int intentosMaximos,
                       @Value("${auth.bloqueo-minutos:15}") int bloqueoMinutos) {
        this.usuarioRepository = usuarioRepository;
        this.authenticationManager = authenticationManager;
        this.intentosMaximos = intentosMaximos;
        this.bloqueoMinutos = bloqueoMinutos;
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
            // defecto, así que este bloque cubre los tres casos: contraseña
            // mal, email inexistente y cuenta de cliente (que
            // UsuarioDetailsService rechaza como inexistente). El mensaje
            // tiene que ser el mismo para todos, o se puede averiguar qué
            // emails están registrados.
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

        // Un solo canal por cuenta (ADR 0005): en una cuenta de cliente,
        // estos campos cuentan CÓDIGOS agotados, no contraseñas. Si el login
        // del equipo los tocara, cualquiera podría bloquear el acceso de un
        // cliente probando contraseñas contra su email.
        if (usuario.getRol() == RolUsuario.CLIENTE) {
            return;
        }

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

package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.CheckoutRequest;
import com.tierra.ecommerce.dto.CrearPedidoRequest;
import com.tierra.ecommerce.dto.PedidoResponseDTO;
import com.tierra.ecommerce.dto.ResultadoCheckout;
import com.tierra.ecommerce.entity.Direccion;
import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.enums.RolUsuario;
import com.tierra.ecommerce.enums.TipoEntrega;
import com.tierra.ecommerce.exception.CuentaExistenteException;
import com.tierra.ecommerce.exception.RecursoNoEncontradoException;
import com.tierra.ecommerce.repository.DireccionRepository;
import com.tierra.ecommerce.repository.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

// Ver docs/decisiones/0005-checkout-invitado-cuenta-implicita.md para el
// porqué de todo esto.
//
// Lo que hace, en una frase: si ya hay sesión, compra esa persona; si no
// hay, crea una cuenta en silencio (o rechaza si el email ya tiene una) y
// deja la sesión iniciada, para que de ahí en más sea indistinguible de
// alguien que inició sesión de la forma tradicional -- todo lo que ya
// existe (PedidoService, el historial, InventarioService) sigue funcionando
// sin saber que esta cuenta se creó distinto.
@Service
public class CheckoutService {

    private final UsuarioRepository usuarioRepository;
    private final DireccionRepository direccionRepository;
    private final PasswordEncoder passwordEncoder;
    private final PedidoService pedidoService;

    public CheckoutService(UsuarioRepository usuarioRepository,
                           DireccionRepository direccionRepository,
                           PasswordEncoder passwordEncoder,
                           PedidoService pedidoService) {
        this.usuarioRepository = usuarioRepository;
        this.direccionRepository = direccionRepository;
        this.passwordEncoder = passwordEncoder;
        this.pedidoService = pedidoService;
    }

    // usuarioIdSesion viene null cuando quien compra no tiene sesión
    // iniciada -- CheckoutController es quien decide eso, mirando el
    // SecurityContext, y se lo pasa ya resuelto. Este service no sabe nada
    // de HTTP ni de cookies, mismo patrón que PedidoService.crearPedido.
    @Transactional
    public ResultadoCheckout procesar(UUID usuarioIdSesion, CheckoutRequest request) {
        Usuario usuario;
        boolean sesionYaExistia = usuarioIdSesion != null;

        if (sesionYaExistia) {
            usuario = usuarioRepository.findById(usuarioIdSesion)
                    .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
        } else {
            usuario = crearCuentaImplicita(request);
        }

        UUID direccionId = null;
        if (request.tipoEntrega() == TipoEntrega.ENVIO_DOMICILIO) {
            direccionId = crearDireccion(usuario, request).getId();
        }

        // Se reutiliza pedidoService.crearPedido tal cual -- reserva de
        // stock, cálculo de envío, cupón, todo -- en vez de duplicar esa
        // lógica acá. El único trabajo nuevo de este método es resolver
        // quién es el usuario y de dónde sale la dirección.
        CrearPedidoRequest pedidoRequest = new CrearPedidoRequest(
                request.tipoEntrega(), direccionId, request.codigoCupon(), request.items());
        PedidoResponseDTO pedido = pedidoService.crearPedido(usuario.getId(), pedidoRequest);

        return new ResultadoCheckout(usuario, pedido, sesionYaExistia);
    }

    private Usuario crearCuentaImplicita(CheckoutRequest request) {
        if (request.nombre() == null || request.nombre().isBlank()) {
            throw new IllegalArgumentException("El nombre es obligatorio");
        }
        if (request.email() == null || request.email().isBlank()) {
            throw new IllegalArgumentException("El email es obligatorio");
        }
        if (request.dni() == null || request.dni().isBlank()) {
            throw new IllegalArgumentException("El DNI es obligatorio");
        }

        // Ya viene normalizado por el constructor compacto de CheckoutRequest,
        // pero AuthService.normalizarEmail es la fuente de verdad de cómo se
        // normaliza un email en todo el sistema -- se reusa en vez de confiar
        // en que las dos normalizaciones nunca diverjan.
        String email = AuthService.normalizarEmail(request.email());

        Optional<Usuario> existente = usuarioRepository.findByEmail(email);
        if (existente.isPresent()) {
            throw new CuentaExistenteException(
                    "Ya existe una cuenta con este email. Iniciá sesión para continuar la compra.");
        }

        Usuario usuario = new Usuario();
        usuario.setNombre(request.nombre());
        usuario.setEmail(email);
        usuario.setDni(request.dni());
        usuario.setTelefono(request.telefono());
        usuario.setRol(RolUsuario.CLIENTE);

        // Contraseña aleatoria, hasheada, que nadie conoce -- ni siquiera
        // pasa por texto plano fuera de este método. Esta cuenta se abre por
        // la sesión que arranca ahora mismo, no por login.
        //
        // TODO (Fase 3, módulo de notificaciones): mandar acá un email con
        // un link para que esta persona elija su propia contraseña. Hasta
        // que exista ese módulo, si cierra sesión sin haber usado ese link
        // no tiene forma de volver a entrar por su cuenta -- mismo límite ya
        // documentado en la 0003 para "olvidé mi contraseña".
        usuario.setPasswordHash(passwordEncoder.encode(generarPasswordAleatoria()));

        return usuarioRepository.save(usuario);
    }

    private Direccion crearDireccion(Usuario usuario, CheckoutRequest request) {
        if (request.direccion() == null) {
            throw new IllegalArgumentException("La dirección de envío es obligatoria para envío a domicilio");
        }
        var d = request.direccion();
        if (d.calle() == null || d.calle().isBlank()) {
            throw new IllegalArgumentException("La calle es obligatoria");
        }
        if (d.ciudad() == null || d.ciudad().isBlank()) {
            throw new IllegalArgumentException("La ciudad es obligatoria");
        }
        if (d.provincia() == null || d.provincia().isBlank()) {
            throw new IllegalArgumentException("La provincia es obligatoria");
        }
        if (d.codigoPostal() == null || d.codigoPostal().isBlank()) {
            throw new IllegalArgumentException("El código postal es obligatorio");
        }

        Direccion direccion = new Direccion();
        direccion.setUsuario(usuario);
        direccion.setCalle(d.calle());
        direccion.setNumero(d.numero());
        direccion.setCiudad(d.ciudad());
        direccion.setProvincia(d.provincia());
        direccion.setCodigoPostal(d.codigoPostal());

        // No hay libreta de direcciones todavía (Fase 2): cada checkout crea
        // una fila nueva, incluso para quien ya compró antes con la misma
        // dirección. Es intencional para esta etapa, no un bug -- elegir
        // entre direcciones guardadas es trabajo de otra tarea.
        direccion.setEsPredeterminada(!direccionRepository.existsByUsuarioId(usuario.getId()));

        return direccionRepository.save(direccion);
    }

    // SecureRandom, no Random: esto se usa como contraseña real de una
    // cuenta real, aunque nadie la vaya a escribir nunca. 24 bytes (192
    // bits) es generoso a propósito -- BCrypt igual trunca en 72 bytes, pero
    // el string Base64 resultante queda bien por debajo de eso.
    private static String generarPasswordAleatoria() {
        byte[] bytes = new byte[24];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}

package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.LoginRequest;
import com.tierra.ecommerce.dto.MensajeResponse;
import com.tierra.ecommerce.dto.SolicitarCodigoRequest;
import com.tierra.ecommerce.dto.UsuarioResponse;
import com.tierra.ecommerce.dto.VerificarCodigoRequest;
import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.exception.CodigoInvalidoException;
import com.tierra.ecommerce.security.SesionAutenticacionService;
import com.tierra.ecommerce.security.UsuarioAutenticado;
import com.tierra.ecommerce.service.AuthService;
import com.tierra.ecommerce.service.CodigoAccesoService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

// Los dos canales de acceso (ADR 0005) y la consulta de la sesión actual.
//
// - Clientes: piden un código de seis dígitos por email y lo verifican. No
//   tienen contraseña.
// - Equipo: email y contraseña, por /equipo/login.
//
// Ninguna cuenta puede usar el canal de la otra. El registro ya no existe:
// los clientes se crean al comprar (tarea 9).
//
// El logout NO está acá: lo maneja el filtro de Spring configurado en
// SecurityConfig, que invalida la sesión del lado del servidor. Un logout
// casero que sólo borre la cookie dejaría la sesión viva y reutilizable.
//
// NUNCA se loguea el cuerpo de estas peticiones: llevan códigos y contraseñas.
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    // La respuesta es SIEMPRE esta, se haya enviado un código o no: si
    // cambiara según el caso, el endpoint serviría para averiguar quién
    // compró en Tierra (ADR 0005).
    public static final String MENSAJE_CODIGO_SOLICITADO =
            "Si ese email tiene compras en Tierra, te enviamos un código. "
            + "Puede tardar unos minutos: revisá también la carpeta de spam.";

    private final AuthService authService;
    private final CodigoAccesoService codigoAccesoService;
    private final SesionAutenticacionService sesionAutenticacionService;

    public AuthController(AuthService authService,
                          CodigoAccesoService codigoAccesoService,
                          SesionAutenticacionService sesionAutenticacionService) {
        this.authService = authService;
        this.codigoAccesoService = codigoAccesoService;
        this.sesionAutenticacionService = sesionAutenticacionService;
    }

    // ---------------------------------------------------------------
    // Clientes: acceso por código
    // ---------------------------------------------------------------

    @PostMapping("/codigo")
    public MensajeResponse solicitarCodigo(@Valid @RequestBody SolicitarCodigoRequest request) {
        codigoAccesoService.solicitar(request.email());
        return new MensajeResponse(MENSAJE_CODIGO_SOLICITADO);
    }

    @PostMapping("/codigo/verificar")
    public UsuarioResponse verificarCodigo(@Valid @RequestBody VerificarCodigoRequest request,
                                           HttpServletRequest httpRequest,
                                           HttpServletResponse httpResponse) {
        Usuario usuario = codigoAccesoService.verificar(request.email(), request.codigo())
                .orElseThrow(CodigoInvalidoException::new);

        UsuarioAutenticado principal = new UsuarioAutenticado(usuario);
        Authentication auth = UsernamePasswordAuthenticationToken.authenticated(
                principal, null, principal.getAuthorities());
        sesionAutenticacionService.iniciarSesion(auth, httpRequest, httpResponse);

        return AuthService.aResponse(usuario);
    }

    // ---------------------------------------------------------------
    // Equipo: email y contraseña
    // ---------------------------------------------------------------

    @PostMapping("/equipo/login")
    public UsuarioResponse loginEquipo(@Valid @RequestBody LoginRequest request,
                                       HttpServletRequest httpRequest,
                                       HttpServletResponse httpResponse) {
        Authentication auth = authService.autenticar(request);
        sesionAutenticacionService.iniciarSesion(auth, httpRequest, httpResponse);
        return AuthService.aResponse((UsuarioAutenticado) auth.getPrincipal());
    }

    // ---------------------------------------------------------------
    // Sesión actual
    // ---------------------------------------------------------------

    @GetMapping("/yo")
    public UsuarioResponse yo(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        // No hace falta chequear null: la regla de SecurityConfig ya exige
        // sesión para llegar acá, y sin ella el entry point devuelve 401.
        return AuthService.aResponse(usuario);
    }
}

package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.LoginRequest;
import com.tierra.ecommerce.dto.RegistroRequest;
import com.tierra.ecommerce.dto.UsuarioResponse;
import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.security.SesionAutenticacionService;
import com.tierra.ecommerce.security.UsuarioAutenticado;
import com.tierra.ecommerce.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

// Registro, login y consulta de la sesión actual.
//
// El logout NO está acá: lo maneja el filtro de Spring configurado en
// SecurityConfig, que invalida la sesión del lado del servidor. Un logout
// casero que sólo borre la cookie dejaría la sesión viva y reutilizable.
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final SesionAutenticacionService sesionAutenticacionService;

    public AuthController(AuthService authService,
                          SesionAutenticacionService sesionAutenticacionService) {
        this.authService = authService;
        this.sesionAutenticacionService = sesionAutenticacionService;
    }

    @PostMapping("/registro")
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioResponse registrar(@Valid @RequestBody RegistroRequest request,
                                     HttpServletRequest httpRequest,
                                     HttpServletResponse httpResponse) {
        Usuario usuario = authService.registrar(request);

        // Se inicia sesión automáticamente: pedirle a alguien que acaba de
        // escribir sus datos que los vuelva a escribir no tiene sentido.
        UsuarioAutenticado principal = new UsuarioAutenticado(usuario);
        Authentication auth = UsernamePasswordAuthenticationToken.authenticated(
                principal, null, principal.getAuthorities());
        sesionAutenticacionService.iniciarSesion(auth, httpRequest, httpResponse);

        return AuthService.aResponse(usuario);
    }

    @PostMapping("/login")
    public UsuarioResponse login(@Valid @RequestBody LoginRequest request,
                                 HttpServletRequest httpRequest,
                                 HttpServletResponse httpResponse) {
        Authentication auth = authService.autenticar(request);
        sesionAutenticacionService.iniciarSesion(auth, httpRequest, httpResponse);
        return AuthService.aResponse((UsuarioAutenticado) auth.getPrincipal());
    }

    @GetMapping("/yo")
    public UsuarioResponse yo(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        // No hace falta chequear null: la regla de SecurityConfig ya exige
        // sesión para llegar acá, y sin ella el entry point devuelve 401.
        return AuthService.aResponse(usuario);
    }
}

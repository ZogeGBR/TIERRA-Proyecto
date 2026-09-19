package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.LoginRequest;
import com.tierra.ecommerce.dto.RegistroRequest;
import com.tierra.ecommerce.dto.UsuarioResponse;
import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.security.UsuarioAutenticado;
import com.tierra.ecommerce.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
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
    private final SecurityContextRepository securityContextRepository;

    public AuthController(AuthService authService,
                          SecurityContextRepository securityContextRepository) {
        this.authService = authService;
        this.securityContextRepository = securityContextRepository;
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
        iniciarSesion(auth, httpRequest, httpResponse);

        return AuthService.aResponse(usuario);
    }

    @PostMapping("/login")
    public UsuarioResponse login(@Valid @RequestBody LoginRequest request,
                                 HttpServletRequest httpRequest,
                                 HttpServletResponse httpResponse) {
        Authentication auth = authService.autenticar(request);
        iniciarSesion(auth, httpRequest, httpResponse);
        return AuthService.aResponse((UsuarioAutenticado) auth.getPrincipal());
    }

    @GetMapping("/yo")
    public UsuarioResponse yo(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        // No hace falta chequear null: la regla de SecurityConfig ya exige
        // sesión para llegar acá, y sin ella el entry point devuelve 401.
        return AuthService.aResponse(usuario);
    }

    // Guarda la autenticación en la sesión HTTP.
    //
    // ESTE ES EL PASO QUE MÁS SE OLVIDA. En Spring Security 6, poner la
    // autenticación en el SecurityContextHolder ya NO la persiste sola: hay
    // que escribirla explícitamente en el repositorio. Buena parte de los
    // ejemplos que circulan son de versiones anteriores y omiten esta línea.
    // El síntoma es desconcertante: el login devuelve 200 con su cookie, y la
    // request siguiente llega sin sesión.
    private void iniciarSesion(Authentication auth,
                               HttpServletRequest request,
                               HttpServletResponse response) {
        // Protección contra fijación de sesión: si alguien llegó con una
        // sesión anónima ya existente, el identificador cambia al autenticarse.
        // El filtro de Spring que hace esto no interviene cuando el login es
        // manual como acá, así que hay que hacerlo a mano.
        HttpSession sesionPrevia = request.getSession(false);
        if (sesionPrevia != null) {
            request.changeSessionId();
        }

        SecurityContext contexto = SecurityContextHolder.createEmptyContext();
        contexto.setAuthentication(auth);
        SecurityContextHolder.setContext(contexto);
        securityContextRepository.saveContext(contexto, request, response);
    }
}

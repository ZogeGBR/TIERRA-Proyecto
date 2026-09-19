package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.RegistroRequest;
import com.tierra.ecommerce.dto.UsuarioResponse;
import com.tierra.ecommerce.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

// Por ahora sólo el alta. El login, el logout y /yo se agregan cuando esté
// configurada la sesión en SecurityConfig: sin eso, autenticar no serviría
// de nada porque no habría dónde guardar la sesión.
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/registro")
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioResponse registrar(@Valid @RequestBody RegistroRequest request) {
        return authService.registrar(request);
    }
}

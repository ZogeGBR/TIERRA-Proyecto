package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.CheckoutRequest;
import com.tierra.ecommerce.dto.CheckoutResponse;
import com.tierra.ecommerce.security.UsuarioAutenticado;
import com.tierra.ecommerce.service.CheckoutService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

// Público: comprar no exige cuenta ni sesión (ADR 0005). Si hay sesión de
// cliente, el pedido va a esa cuenta. Sin sesión, el principal llega null
// (el usuario anónimo no es un UsuarioAutenticado). El checkout nunca abre
// una sesión.
@RestController
@RequestMapping("/api/checkout")
public class CheckoutController {

    private final CheckoutService checkoutService;

    public CheckoutController(CheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CheckoutResponse comprar(@AuthenticationPrincipal UsuarioAutenticado sesion,
                                    @Valid @RequestBody CheckoutRequest request) {
        return checkoutService.comprar(request, sesion);
    }
}

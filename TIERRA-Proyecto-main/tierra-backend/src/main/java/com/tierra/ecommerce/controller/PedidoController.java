package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.CrearPedidoRequest;
import com.tierra.ecommerce.dto.PedidoResponseDTO;
import com.tierra.ecommerce.security.UsuarioAutenticado;
import com.tierra.ecommerce.service.PedidoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final PedidoService pedidoService;

    public PedidoController(PedidoService pedidoService) {
        this.pedidoService = pedidoService;
    }

    // De quién es el pedido lo decide la sesión, no el cuerpo del request.
    // La regla de SecurityConfig ya exige sesión para llegar acá, así que el
    // principal nunca llega nulo: sin sesión, el entry point devuelve 401
    // antes de que este método se ejecute.
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PedidoResponseDTO crear(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                   @Valid @RequestBody CrearPedidoRequest request) {
        return pedidoService.crearPedido(usuario.getId(), request);
    }
}

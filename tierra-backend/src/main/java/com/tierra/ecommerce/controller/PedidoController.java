package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.PedidoHistorialDTO;
import com.tierra.ecommerce.security.UsuarioAutenticado;
import com.tierra.ecommerce.service.HistorialPedidosService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// El historial del cliente (tarea 19). Los pedidos se crean únicamente con
// POST /api/checkout (ADR 0005); acá solo se consultan.
@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final HistorialPedidosService historialPedidosService;

    public PedidoController(HistorialPedidosService historialPedidosService) {
        this.historialPedidosService = historialPedidosService;
    }

    // Rol CLIENTE (SecurityConfig). Siempre los pedidos de la sesión.
    @GetMapping("/mios")
    public List<PedidoHistorialDTO> mios(@AuthenticationPrincipal UsuarioAutenticado sesion) {
        return historialPedidosService.deCliente(sesion.getId());
    }
}

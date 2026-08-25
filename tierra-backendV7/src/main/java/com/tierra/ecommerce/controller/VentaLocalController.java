package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.CrearVentaLocalRequest;
import com.tierra.ecommerce.dto.VentaLocalResponseDTO;
import com.tierra.ecommerce.service.VentaLocalService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

// Endpoints para el mostrador (POS web, dentro de la misma plataforma).
// No requieren reserva de stock: el producto ya está en la mano del
// cliente cuando se registra la venta.
@RestController
@RequestMapping("/api/ventas-locales")
public class VentaLocalController {

    private final VentaLocalService ventaLocalService;

    public VentaLocalController(VentaLocalService ventaLocalService) {
        this.ventaLocalService = ventaLocalService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VentaLocalResponseDTO registrar(@Valid @RequestBody CrearVentaLocalRequest request) {
        return ventaLocalService.registrarVenta(request);
    }
}

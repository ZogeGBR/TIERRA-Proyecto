package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.AbrirSesionCajaRequest;
import com.tierra.ecommerce.dto.CerrarSesionCajaRequest;
import com.tierra.ecommerce.dto.SesionCajaResponseDTO;
import com.tierra.ecommerce.service.SesionCajaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/caja/sesiones")
public class SesionCajaController {

    private final SesionCajaService sesionCajaService;

    public SesionCajaController(SesionCajaService sesionCajaService) {
        this.sesionCajaService = sesionCajaService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SesionCajaResponseDTO abrir(@Valid @RequestBody AbrirSesionCajaRequest request) {
        return sesionCajaService.abrir(request.usuarioId(), request.ubicacionId(), request.montoInicial());
    }

    @PostMapping("/{id}/cerrar")
    public SesionCajaResponseDTO cerrar(@PathVariable UUID id, @Valid @RequestBody CerrarSesionCajaRequest request) {
        return sesionCajaService.cerrar(id, request.montoFinal());
    }
}

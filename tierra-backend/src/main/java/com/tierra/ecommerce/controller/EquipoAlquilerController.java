package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.CrearReservaRequest;
import com.tierra.ecommerce.dto.EquipoDisponibleDTO;
import com.tierra.ecommerce.dto.ReservaResponseDTO;
import com.tierra.ecommerce.service.DisponibilidadAlquilerService;
import com.tierra.ecommerce.service.ReservaAlquilerService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/alquiler")
public class EquipoAlquilerController {

    private final DisponibilidadAlquilerService disponibilidadService;
    private final ReservaAlquilerService reservaService;

    public EquipoAlquilerController(DisponibilidadAlquilerService disponibilidadService,
                                     ReservaAlquilerService reservaService) {
        this.disponibilidadService = disponibilidadService;
        this.reservaService = reservaService;
    }

    // ej: GET /api/alquiler/disponibilidad?tipoId=...&fechaInicio=2026-07-10&fechaFin=2026-07-15
    @GetMapping("/disponibilidad")
    public List<EquipoDisponibleDTO> disponibilidad(
            @RequestParam UUID tipoId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin) {
        return disponibilidadService.buscarDisponibles(tipoId, fechaInicio, fechaFin);
    }

        // ===================================================================
    // CONGELADO — decisión 0001 (docs/decisiones/0001-tierra-rental-consulta-whatsapp.md)
    //
    // Tierra Rental NO toma reservas en línea. El flujo real es: el usuario
    // elige fechas y cantidad, se arma un mensaje de WhatsApp consultando
    // disponibilidad, y la reserva se confirma en el local.
    //
    // Este endpoint queda comentado, no eliminado: el modelo de datos y el
    // constraint EXCLUDE de no-solapamiento están bien resueltos y sirven tal
    // cual si el módulo se vende como anexo más adelante.
    //
    // NO construir sobre este endpoint ni reactivarlo sin revisar la decisión.
    // ===================================================================
    //
    // @PostMapping("/reservas")
    // @ResponseStatus(HttpStatus.CREATED)
    // public ReservaResponseDTO reservar(@Valid @RequestBody CrearReservaRequest request) {
    //     return reservaService.crearReserva(request);
    // }
}

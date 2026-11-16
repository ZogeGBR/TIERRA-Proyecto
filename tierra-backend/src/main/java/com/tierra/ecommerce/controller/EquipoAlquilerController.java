package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.CrearReservaRequest;
import com.tierra.ecommerce.dto.EquipoDisponibleDTO;
import com.tierra.ecommerce.dto.ReservaResponseDTO;
import com.tierra.ecommerce.dto.TipoAlquilerDTO;
import com.tierra.ecommerce.service.DisponibilidadAlquilerService;
import com.tierra.ecommerce.service.ReservaAlquilerService;
import com.tierra.ecommerce.service.TipoAlquilerService;
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

    private final TipoAlquilerService tipoAlquilerService;
    private final DisponibilidadAlquilerService disponibilidadService;
    private final ReservaAlquilerService reservaService;

    public EquipoAlquilerController(TipoAlquilerService tipoAlquilerService,
                                     DisponibilidadAlquilerService disponibilidadService,
                                     ReservaAlquilerService reservaService) {
        this.tipoAlquilerService = tipoAlquilerService;
        this.disponibilidadService = disponibilidadService;
        this.reservaService = reservaService;
    }

    // Los tipos de equipo con su precio por día, para el estimador de la
    // página de alquiler (tarea 20). Público. Solo los que tienen precio.
    @GetMapping("/tipos")
    public List<TipoAlquilerDTO> tipos() {
        return tipoAlquilerService.listarConPrecio();
    }

    // ===================================================================
    // CONGELADO — decisión 0001 (docs/decisiones/0001-tierra-rental-consulta-whatsapp.md)
    //
    // Tierra Rental NO toma reservas en línea. El flujo real es: el usuario
    // elige fechas y cantidad, se arma un mensaje de WhatsApp consultando
    // disponibilidad, y la reserva se confirma en el local.
    //
    // Estos dos endpoints quedan comentados, no eliminados: el modelo de
    // datos y el constraint EXCLUDE de no-solapamiento están bien resueltos y
    // sirven tal cual si el módulo se vende como anexo más adelante.
    //
    // GET /disponibilidad calculaba qué unidades estaban libres en un rango
    // de fechas. Como las reservas se confirman en el local, la base nunca
    // refleja el estado real del equipo: el sistema no conoce la
    // disponibilidad y no la promete (tarea 20).
    //
    // NO construir sobre estos endpoints ni reactivarlos sin revisar la
    // decisión. SecurityConfig solo deja público GET /api/alquiler/tipos: lo
    // demás bajo /api/alquiler cae en el cierre por denegación.
    // ===================================================================
    //
    // // ej: GET /api/alquiler/disponibilidad?tipoId=...&fechaInicio=2026-07-10&fechaFin=2026-07-15
    // @GetMapping("/disponibilidad")
    // public List<EquipoDisponibleDTO> disponibilidad(
    //         @RequestParam UUID tipoId,
    //         @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
    //         @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin) {
    //     return disponibilidadService.buscarDisponibles(tipoId, fechaInicio, fechaFin);
    // }
    //
    // @PostMapping("/reservas")
    // @ResponseStatus(HttpStatus.CREATED)
    // public ReservaResponseDTO reservar(@Valid @RequestBody CrearReservaRequest request) {
    //     return reservaService.crearReserva(request);
    // }
}

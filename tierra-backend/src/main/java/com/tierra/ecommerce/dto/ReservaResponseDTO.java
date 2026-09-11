package com.tierra.ecommerce.dto;

import com.tierra.ecommerce.enums.EstadoReserva;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ReservaResponseDTO(
        UUID id,
        EstadoReserva estado,
        LocalDate fechaInicio,
        LocalDate fechaFin,
        BigDecimal precioTotal,
        BigDecimal depositoTotal
) {}

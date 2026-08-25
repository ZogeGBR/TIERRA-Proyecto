package com.tierra.ecommerce.dto;

import com.tierra.ecommerce.enums.EstadoSesionCaja;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record SesionCajaResponseDTO(
        UUID id,
        EstadoSesionCaja estado,
        BigDecimal montoInicial,
        BigDecimal montoFinal,
        LocalDateTime abiertaEn,
        LocalDateTime cerradaEn
) {}

package com.tierra.ecommerce.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record AbrirSesionCajaRequest(
        @NotNull UUID usuarioId,
        @NotNull UUID ubicacionId,
        @NotNull BigDecimal montoInicial
) {}

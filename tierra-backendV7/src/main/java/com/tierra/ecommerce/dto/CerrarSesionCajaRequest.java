package com.tierra.ecommerce.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CerrarSesionCajaRequest(@NotNull BigDecimal montoFinal) {}

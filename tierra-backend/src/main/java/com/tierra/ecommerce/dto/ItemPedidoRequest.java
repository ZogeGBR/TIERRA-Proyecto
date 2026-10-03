package com.tierra.ecommerce.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ItemPedidoRequest(
        @NotNull UUID varianteId,
        @Min(1) int cantidad
) {}

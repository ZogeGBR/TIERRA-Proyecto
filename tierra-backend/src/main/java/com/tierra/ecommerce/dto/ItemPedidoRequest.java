package com.tierra.ecommerce.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ItemPedidoRequest(
        @NotNull(message = "Falta la variante de un producto") UUID varianteId,
        @Min(value = 1, message = "La cantidad tiene que ser al menos 1") int cantidad
) {}

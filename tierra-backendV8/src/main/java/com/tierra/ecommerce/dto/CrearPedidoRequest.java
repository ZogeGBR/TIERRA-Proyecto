package com.tierra.ecommerce.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record CrearPedidoRequest(
        @NotNull UUID usuarioId,
        @NotNull UUID direccionEnvioId,
        String codigoCupon,
        @NotEmpty @Valid List<ItemPedidoRequest> items
) {}

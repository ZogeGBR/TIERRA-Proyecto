package com.tierra.ecommerce.dto;

import com.tierra.ecommerce.enums.TipoEntrega;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record CrearPedidoRequest(
        @NotNull UUID usuarioId,
        @NotNull TipoEntrega tipoEntrega,
        UUID direccionEnvioId,
        String codigoCupon,
        @NotEmpty @Valid List<ItemPedidoRequest> items
) {}

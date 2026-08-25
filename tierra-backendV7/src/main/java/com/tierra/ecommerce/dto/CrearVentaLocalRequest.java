package com.tierra.ecommerce.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record CrearVentaLocalRequest(
        @NotNull UUID sesionCajaId,
        @NotEmpty @Valid List<ItemVentaLocalRequest> items,
        @NotEmpty @Valid List<PagoVentaLocalRequest> pagos
) {}

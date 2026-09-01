package com.tierra.ecommerce.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CrearReservaRequest(
        @NotNull UUID usuarioId,
        @NotNull @Future LocalDate fechaInicio,
        @NotNull @Future LocalDate fechaFin,
        @NotEmpty @Valid List<ItemReservaRequest> equipos
) {}

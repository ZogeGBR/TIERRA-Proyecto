package com.tierra.ecommerce.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ItemReservaRequest(@NotNull UUID equipoId) {}

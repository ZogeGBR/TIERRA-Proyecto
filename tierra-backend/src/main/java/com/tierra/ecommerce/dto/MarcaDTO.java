package com.tierra.ecommerce.dto;

import java.util.UUID;

public record MarcaDTO(
        UUID id,
        String nombre,
        String logoUrl
) {}

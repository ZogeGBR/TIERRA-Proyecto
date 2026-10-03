package com.tierra.ecommerce.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductoResumenDTO(
        UUID id,
        String nombre,
        String marca,
        String categoria,
        BigDecimal precio,
        String imagenPrincipal
) {}

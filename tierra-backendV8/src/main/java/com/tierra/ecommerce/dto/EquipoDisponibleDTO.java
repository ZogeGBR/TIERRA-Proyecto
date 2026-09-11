package com.tierra.ecommerce.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record EquipoDisponibleDTO(
        UUID id,
        String tipo,
        String marca,
        String modelo,
        String talla,
        BigDecimal precioDia,
        BigDecimal depositoGarantia
) {}

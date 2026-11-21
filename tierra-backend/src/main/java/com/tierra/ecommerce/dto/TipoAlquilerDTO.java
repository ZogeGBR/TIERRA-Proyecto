package com.tierra.ecommerce.dto;

import java.math.BigDecimal;
import java.util.UUID;

// Un tipo de equipo para el estimador de la página de alquiler: precio por
// día de una unidad. Sin disponibilidad (decisión 0001).
public record TipoAlquilerDTO(
        UUID id,
        String nombre,
        BigDecimal precioDia
) {}

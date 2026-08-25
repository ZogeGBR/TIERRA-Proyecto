package com.tierra.ecommerce.dto;

import com.tierra.ecommerce.enums.MetodoPago;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

// El cobro con tarjeta ocurre en la terminal Point, fuera del software:
// acá solo se registra "hubo un cobro con tarjeta por tal monto", igual
// que se registra el efectivo. Permite combinar medios (ej. efectivo +
// tarjeta) en una misma venta.
public record PagoVentaLocalRequest(
        @NotNull MetodoPago metodo,
        @NotNull BigDecimal monto
) {}

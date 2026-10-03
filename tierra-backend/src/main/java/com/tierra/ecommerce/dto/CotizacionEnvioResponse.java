package com.tierra.ecommerce.dto;

import java.math.BigDecimal;

// Misma salvedad que CotizacionEnvioRequest: forma provisoria, a confirmar
// contra la documentación real.
public record CotizacionEnvioResponse(
        BigDecimal costo,
        String fechaEstimadaEntrega
) {}

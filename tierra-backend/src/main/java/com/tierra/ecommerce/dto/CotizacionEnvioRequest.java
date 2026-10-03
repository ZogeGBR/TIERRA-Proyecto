package com.tierra.ecommerce.dto;

import java.math.BigDecimal;

// Lo que hace falta para pedirle a Andreani el costo de un envío.
//
// La forma de estos campos es la mejor información disponible hoy, tomada
// de integraciones públicas de terceros con la API de Andreani (no de la
// documentación oficial completa, a la que todavía no tenemos acceso sin
// ser clientes). CONFIRMAR contra el catálogo OpenAPI real
// (developers-sandbox.andreani.com) apenas Tierra tenga credenciales --
// ver AndreaniService y docs/decisiones/0005.
public record CotizacionEnvioRequest(
        String codigoPostalDestino,
        BigDecimal pesoKg,
        BigDecimal valorDeclarado
) {}

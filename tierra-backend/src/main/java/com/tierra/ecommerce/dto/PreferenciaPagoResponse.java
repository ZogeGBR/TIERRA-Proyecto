package com.tierra.ecommerce.dto;

// initPoint es la URL de checkout de Mercado Pago a la que el frontend
// redirige al usuario para completar el pago (tarjeta, cuotas, dinero en cuenta, etc.)
public record PreferenciaPagoResponse(String preferenceId, String initPoint) {}

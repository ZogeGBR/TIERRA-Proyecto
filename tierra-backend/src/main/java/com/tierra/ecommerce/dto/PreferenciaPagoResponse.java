package com.tierra.ecommerce.dto;

import java.time.OffsetDateTime;

// expiraEn: hasta cuándo sirve el link de pago (el vencimiento de la
// preferencia de Mercado Pago). El checkout lo devuelve para que el frontend
// pueda ofrecer "volver a pagar" con el mismo link mientras no venza.
public record PreferenciaPagoResponse(String preferenceId, String initPoint, OffsetDateTime expiraEn) {}

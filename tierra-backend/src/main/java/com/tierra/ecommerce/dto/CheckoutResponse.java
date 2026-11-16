package com.tierra.ecommerce.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

// Lo mismo para un email nuevo y uno existente (ADR 0005): si la respuesta
// cambiara, el checkout serviría para averiguar quién compró en Tierra.
// expiraEn es el vencimiento del link de pago, con su zona horaria, para que
// el navegador lo interprete bien sin importar dónde corre el servidor.
public record CheckoutResponse(UUID pedidoId, BigDecimal total, String initPoint, OffsetDateTime expiraEn) {}

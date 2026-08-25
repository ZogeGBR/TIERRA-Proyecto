package com.tierra.ecommerce.dto;

import com.tierra.ecommerce.enums.EstadoPedido;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record PedidoResponseDTO(
        UUID id,
        EstadoPedido estado,
        BigDecimal subtotal,
        BigDecimal descuento,
        BigDecimal costoEnvio,
        BigDecimal total,
        LocalDateTime creadoEn
) {}

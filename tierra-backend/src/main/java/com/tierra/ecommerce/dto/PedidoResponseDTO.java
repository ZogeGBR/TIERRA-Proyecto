package com.tierra.ecommerce.dto;

import com.tierra.ecommerce.entity.DireccionEntrega;
import com.tierra.ecommerce.enums.EstadoPedido;
import com.tierra.ecommerce.enums.TipoEntrega;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record PedidoResponseDTO(
        UUID id,
        TipoEntrega tipoEntrega,
        DireccionEntrega direccionEntrega,
        EstadoPedido estado,
        BigDecimal subtotal,
        BigDecimal descuento,
        BigDecimal costoEnvio,
        BigDecimal total,
        LocalDateTime creadoEn
) {}

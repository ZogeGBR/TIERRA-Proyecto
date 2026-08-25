package com.tierra.ecommerce.dto;

import com.tierra.ecommerce.enums.EstadoPedido;

import java.math.BigDecimal;
import java.util.UUID;

public record VentaLocalResponseDTO(UUID pedidoId, EstadoPedido estado, BigDecimal total) {}

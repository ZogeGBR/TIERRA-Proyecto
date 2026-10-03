package com.tierra.ecommerce.enums;

// EXPIRADO: el pedido venció (reserva de stock liberada) sin que Mercado Pago
// informara ningún pago aprobado. Es un estado final: ningún pago queda
// PENDIENTE para siempre (ver PagoService#resolverPedidoVencido).
public enum EstadoPago {
    PENDIENTE, APROBADO, RECHAZADO, REEMBOLSADO, EXPIRADO
}

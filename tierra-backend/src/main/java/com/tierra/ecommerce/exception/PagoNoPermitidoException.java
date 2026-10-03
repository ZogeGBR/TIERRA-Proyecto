package com.tierra.ecommerce.exception;

// El pedido existe pero no se puede pagar en su estado actual: ya está pagado,
// fue cancelado, o venció la reserva de stock. Se responde 409 (conflicto)
// con un mensaje apto para mostrarle al usuario.
public class PagoNoPermitidoException extends RuntimeException {
    public PagoNoPermitidoException(String mensaje) {
        super(mensaje);
    }
}

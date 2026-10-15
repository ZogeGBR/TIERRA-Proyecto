package com.tierra.ecommerce.exception;

// Un código de acceso que no sirve, por la razón que sea: incorrecto,
// vencido, agotado, ya usado, email inexistente, cuenta del equipo, cliente
// bloqueado. El mensaje es siempre el mismo a propósito (ADR 0005).
public class CodigoInvalidoException extends RuntimeException {

    public static final String MENSAJE = "El código es incorrecto o venció. Pedí uno nuevo.";

    public CodigoInvalidoException() {
        super(MENSAJE);
    }
}

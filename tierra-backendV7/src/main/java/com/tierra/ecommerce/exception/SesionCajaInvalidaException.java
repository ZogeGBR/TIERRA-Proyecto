package com.tierra.ecommerce.exception;

public class SesionCajaInvalidaException extends RuntimeException {
    public SesionCajaInvalidaException(String mensaje) {
        super(mensaje);
    }
}

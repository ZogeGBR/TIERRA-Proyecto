package com.tierra.ecommerce.exception;

public class CuentaBloqueadaException extends RuntimeException {
    public CuentaBloqueadaException(String mensaje) {
        super(mensaje);
    }
}

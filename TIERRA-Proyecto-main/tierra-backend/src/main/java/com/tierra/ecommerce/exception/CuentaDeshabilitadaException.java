package com.tierra.ecommerce.exception;

public class CuentaDeshabilitadaException extends RuntimeException {
    public CuentaDeshabilitadaException(String mensaje) {
        super(mensaje);
    }
}

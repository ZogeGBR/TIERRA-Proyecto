package com.tierra.ecommerce.exception;

public class EmailYaRegistradoException extends RuntimeException {
    public EmailYaRegistradoException(String mensaje) {
        super(mensaje);
    }
}

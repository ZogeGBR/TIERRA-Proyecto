package com.tierra.ecommerce.exception;

import java.time.LocalDateTime;

public record ErrorResponse(String mensaje, LocalDateTime timestamp) {
    public ErrorResponse(String mensaje) {
        this(mensaje, LocalDateTime.now());
    }
}

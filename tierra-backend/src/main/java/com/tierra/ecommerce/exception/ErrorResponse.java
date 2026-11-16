package com.tierra.ecommerce.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;

// codigo: opcional, para los casos en que el frontend tiene que reaccionar
// distinto según el motivo (por ejemplo EMAIL_DEL_EQUIPO en un 409). Así no
// depende del texto del mensaje, que se puede reescribir. Si no hay código,
// el campo no aparece en el JSON.
public record ErrorResponse(String mensaje, LocalDateTime timestamp,
                            @JsonInclude(JsonInclude.Include.NON_NULL) String codigo) {

    public ErrorResponse(String mensaje) {
        this(mensaje, LocalDateTime.now(), null);
    }

    public ErrorResponse(String mensaje, String codigo) {
        this(mensaje, LocalDateTime.now(), codigo);
    }
}

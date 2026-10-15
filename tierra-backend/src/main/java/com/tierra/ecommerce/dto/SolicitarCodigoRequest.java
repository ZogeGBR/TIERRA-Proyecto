package com.tierra.ecommerce.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Pedido de un código de acceso. Validar el formato acá no revela nada:
// "ese texto no es un email" es cierto para cualquiera, esté registrado o no.
public record SolicitarCodigoRequest(
        @NotBlank(message = "El email es obligatorio")
        @Email(message = "El email no tiene un formato válido")
        @Size(max = 150, message = "El email no puede superar los 150 caracteres")
        String email
) {
    public SolicitarCodigoRequest {
        email = email == null ? null : email.trim().toLowerCase();
    }
}

package com.tierra.ecommerce.dto;

import jakarta.validation.constraints.NotBlank;

// Sin @Email ni @Size a propósito: en el login no hay que validar el formato,
// sino comparar contra lo guardado. Un mensaje de "email inválido" le diría
// al atacante que esa dirección no puede existir en el sistema.
public record LoginRequest(
        @NotBlank(message = "El email es obligatorio") String email,
        @NotBlank(message = "La contraseña es obligatoria") String password
) {
    // Misma normalización que en el registro, o alguien que se registró
    // desde el celular con la mayúscula automática no podría volver a entrar.
    // La contraseña, igual que allá, se deja intacta.
    public LoginRequest {
        email = email == null ? null : email.trim().toLowerCase();
    }
}

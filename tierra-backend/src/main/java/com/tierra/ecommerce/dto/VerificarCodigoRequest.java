package com.tierra.ecommerce.dto;

import jakarta.validation.constraints.NotBlank;

// Sin validar el formato del código a propósito: cualquier código que no
// sirva recibe el MISMO error genérico (ver CodigoAccesoService.verificar),
// sea porque está mal escrito, vencido, agotado o porque el email no existe.
public record VerificarCodigoRequest(
        @NotBlank(message = "El email es obligatorio") String email,
        @NotBlank(message = "El código es obligatorio") String codigo
) {
    public VerificarCodigoRequest {
        email = email == null ? null : email.trim().toLowerCase();
        codigo = codigo == null ? null : codigo.trim();
    }
}

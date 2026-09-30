package com.tierra.ecommerce.dto;

import com.tierra.ecommerce.enums.TipoEntrega;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

// Checkout con cuenta implícita: la puerta de entrada para comprar sin
// haber iniciado sesión antes. Ver docs/decisiones/0005.
//
// nombre, email y dni NO llevan @NotBlank a propósito: si quien llama ya
// tiene sesión iniciada (CheckoutController se lo pasa a CheckoutService),
// esos datos no hacen falta -- ya están en la cuenta -- y exigirlos acá
// rompería ese camino. La obligatoriedad condicional se valida en
// CheckoutService, con el mismo criterio que ya usa PedidoService para la
// dirección de envío.
public record CheckoutRequest(
        @Size(max = 150, message = "El nombre no puede superar los 150 caracteres")
        String nombre,

        @Email(message = "El email no tiene un formato válido")
        @Size(max = 150, message = "El email no puede superar los 150 caracteres")
        String email,

        @Size(max = 20, message = "El DNI no puede superar los 20 caracteres")
        String dni,

        @Size(max = 30, message = "El teléfono no puede superar los 30 caracteres")
        String telefono,

        @NotNull(message = "El tipo de entrega es obligatorio")
        TipoEntrega tipoEntrega,

        @Valid
        DireccionCheckoutRequest direccion,

        String codigoCupon,

        @NotEmpty(message = "El pedido no puede estar vacío")
        @Valid
        List<ItemPedidoRequest> items
) {
    // Misma normalización que RegistroRequest y LoginRequest: minúsculas y
    // sin espacios, porque el UNIQUE de la base distingue mayúsculas.
    public CheckoutRequest {
        email = email == null ? null : email.trim().toLowerCase();
        nombre = nombre == null ? null : nombre.trim();
        dni = dni == null ? null : dni.trim();
        telefono = (telefono == null || telefono.isBlank()) ? null : telefono.trim();
    }
}

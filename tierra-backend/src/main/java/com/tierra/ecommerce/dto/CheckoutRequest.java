package com.tierra.ecommerce.dto;

import com.tierra.ecommerce.enums.TipoEntrega;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

// POST /api/checkout (ADR 0005). Se compra sin cuenta: los datos de contacto y
// la dirección viajan en el pedido. Las reglas que dependen del tipo de
// entrega (DNI y dirección solo con envío) las valida CheckoutService.
public record CheckoutRequest(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 150, message = "El nombre no puede superar los 150 caracteres")
        String nombre,

        // Con sesión de cliente se ignora: el pedido va a la cuenta de la sesión.
        @NotBlank(message = "El email es obligatorio")
        @Email(message = "El email no tiene un formato válido")
        @Size(max = 150, message = "El email no puede superar los 150 caracteres")
        String email,

        @NotBlank(message = "El teléfono es obligatorio")
        @Size(max = 30, message = "El teléfono no puede superar los 30 caracteres")
        String telefono,

        // Solo con envío a domicilio.
        @Size(max = 20, message = "El DNI no puede superar los 20 caracteres")
        String dni,

        @NotNull(message = "El tipo de entrega es obligatorio")
        TipoEntrega tipoEntrega,

        // Solo con envío a domicilio.
        @Valid
        DireccionCheckout direccion,

        @NotEmpty(message = "El carrito está vacío")
        @Size(max = 50, message = "No se pueden comprar más de 50 productos distintos a la vez")
        @Valid
        List<ItemPedidoRequest> items
) {
    public record DireccionCheckout(
            @Size(max = 200, message = "La calle no puede superar los 200 caracteres") String calle,
            @Size(max = 20, message = "El número no puede superar los 20 caracteres") String numero,
            @Size(max = 10, message = "El piso no puede superar los 10 caracteres") String piso,
            @Size(max = 10, message = "El departamento no puede superar los 10 caracteres") String departamento,
            @Size(max = 100, message = "La ciudad no puede superar los 100 caracteres") String ciudad,
            @Size(max = 100, message = "La provincia no puede superar los 100 caracteres") String provincia,
            @Size(max = 20, message = "El código postal no puede superar los 20 caracteres") String codigoPostal
    ) {}
}

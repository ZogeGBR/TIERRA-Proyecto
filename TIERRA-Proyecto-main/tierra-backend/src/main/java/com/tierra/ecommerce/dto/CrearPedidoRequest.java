package com.tierra.ecommerce.dto;

import com.tierra.ecommerce.enums.TipoEntrega;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

// NO declara usuarioId a propósito.
//
// Antes lo recibía del cliente, y eso volvía inútil la validación de que la
// dirección pertenezca al usuario: alcanzaba con mandar el id de otra persona
// junto con una dirección suya para que la comparación diera verdadero. El
// usuario ahora sale de la sesión, que el cliente no puede falsificar.
public record CrearPedidoRequest(
        @NotNull TipoEntrega tipoEntrega,
        UUID direccionEnvioId,
        String codigoCupon,
        @NotEmpty @Valid List<ItemPedidoRequest> items
) {}

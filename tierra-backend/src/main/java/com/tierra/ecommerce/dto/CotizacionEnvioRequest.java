package com.tierra.ecommerce.dto;

import com.tierra.ecommerce.enums.TipoEntrega;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

// POST /api/envios/cotizacion. Provincia y código postal solo hacen falta con
// envío a domicilio. Los ítems hacen falta siempre: el costo con Andreani va a
// depender del peso y el valor de lo que se compra.
public record CotizacionEnvioRequest(
        @NotNull(message = "El tipo de entrega es obligatorio") TipoEntrega tipoEntrega,
        @Size(max = 100, message = "La provincia no puede superar los 100 caracteres") String provincia,
        @Size(max = 20, message = "El código postal no puede superar los 20 caracteres") String codigoPostal,
        @NotEmpty(message = "Tiene que haber al menos un producto")
        @Size(max = 50, message = "No se pueden cotizar más de 50 productos distintos a la vez")
        @Valid List<ItemPedidoRequest> items
) {}

package com.tierra.ecommerce.dto;

// Dirección "en crudo" para el checkout con cuenta implícita: a diferencia
// de CrearPedidoRequest (que espera el UUID de una dirección YA guardada en
// la libreta del usuario), acá la persona puede no tener ninguna todavía
// -- de hecho, si la cuenta se está creando en este mismo request, es
// matemáticamente imposible que tenga una.
//
// No lleva anotaciones de validación a nivel de campo a propósito: cuáles
// son obligatorias depende de si hay sesión o no (ver CheckoutService), así
// que se valida ahí, con el mismo criterio que ya usa PedidoService para
// "la dirección es obligatoria para envío a domicilio".
public record DireccionCheckoutRequest(
        String calle,
        String numero,
        String ciudad,
        String provincia,
        String codigoPostal
) {}

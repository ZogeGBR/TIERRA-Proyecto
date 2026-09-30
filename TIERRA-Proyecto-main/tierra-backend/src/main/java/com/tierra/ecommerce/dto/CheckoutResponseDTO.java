package com.tierra.ecommerce.dto;

// Devuelve el usuario junto con el pedido: si no había sesión, el checkout
// acaba de crear (o encontrar) una cuenta y dejarla logueada, y el frontend
// necesita esos datos para actualizar el estado de sesión sin tener que
// pedirle a /api/auth/yo enseguida después.
public record CheckoutResponseDTO(
        UsuarioResponse usuario,
        PedidoResponseDTO pedido
) {}

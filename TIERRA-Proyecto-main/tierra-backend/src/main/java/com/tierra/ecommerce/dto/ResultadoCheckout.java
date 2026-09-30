package com.tierra.ecommerce.dto;

import com.tierra.ecommerce.entity.Usuario;

// Resultado interno de CheckoutService.procesar -- no es lo que se manda al
// frontend (eso es CheckoutResponseDTO). Lleva la entidad Usuario completa
// porque CheckoutController todavía necesita armar la Authentication para
// abrir la sesión, y para eso hace falta más que lo que expone UsuarioResponse.
public record ResultadoCheckout(
        Usuario usuario,
        PedidoResponseDTO pedido,
        boolean sesionYaExistia
) {}

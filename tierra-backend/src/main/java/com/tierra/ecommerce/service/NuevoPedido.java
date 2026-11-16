package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.ItemPedidoRequest;
import com.tierra.ecommerce.entity.DireccionEntrega;
import com.tierra.ecommerce.enums.TipoEntrega;

import java.util.List;

// Lo que necesita PedidoService para armar un pedido, ya validado por quien lo
// llama (CheckoutService). La dirección viaja en línea, no como el id de una
// dirección guardada (ADR 0005): así no hay "direcciones ajenas" que validar.
public record NuevoPedido(
        TipoEntrega tipoEntrega,
        DireccionEntrega direccion,   // null con retiro en el local
        String contactoNombre,
        String contactoTelefono,
        String contactoDni,           // null con retiro en el local
        List<ItemPedidoRequest> items
) {}

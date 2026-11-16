package com.tierra.ecommerce.dto;

import com.tierra.ecommerce.entity.DireccionEntrega;
import com.tierra.ecommerce.enums.EstadoPedido;
import com.tierra.ecommerce.enums.TipoEntrega;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

// Un pedido en GET /api/pedidos/mios (tarea 19). contactoTelefono y
// contactoDni llegan YA ocultos ("••• 3456", "***.***.222"): ver Ocultar.
// creadoEn lleva la zona horaria, para que el navegador muestre la hora
// correcta sin importar dónde corre el servidor.
public record PedidoHistorialDTO(
        UUID id,
        EstadoPedido estado,
        OffsetDateTime creadoEn,
        TipoEntrega tipoEntrega,
        DireccionEntrega direccionEntrega,
        String contactoNombre,
        String contactoTelefono,
        String contactoDni,
        BigDecimal subtotal,
        BigDecimal descuento,
        BigDecimal costoEnvio,
        BigDecimal total,
        List<Item> items
) {
    // Lo que se compró, tal como se guardó en el pedido (V12).
    public record Item(String nombreProducto, String talla, String color, int cantidad, BigDecimal precioUnitario) {}
}

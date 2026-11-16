package com.tierra.ecommerce.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ProductoDetalleDTO(
        UUID id,
        String nombre,
        String descripcion,
        String marca,
        String categoria,
        String genero,
        BigDecimal precio,
        List<VarianteDTO> variantes,
        List<String> imagenes
) {
    // precio: el de esta variante (precio del producto + adicional de la
    // variante), que es lo que se cobra. stock: unidades disponibles.
    public record VarianteDTO(UUID id, String sku, String talla, String color, int stock, boolean controlaStock,
                              BigDecimal precio) {}
}

package com.tierra.ecommerce.service.envio;

import java.math.BigDecimal;
import java.util.List;

// Todo lo que un correo necesita para cotizar un envío a domicilio. Andreani
// pide el código postal de destino y, por cada bulto, peso, medidas y valor
// declarado (decisión 0006). El cotizador fijo no usa nada de esto, pero el
// dato ya viaja armado para que la implementación de Andreani no tenga que
// cambiar quién la llama.
public record SolicitudCotizacion(
        String provincia,
        String codigoPostal,
        List<Bulto> bultos,
        // Suma de lo que se compra (precio de cada variante por su cantidad).
        BigDecimal valorDeclarado
) {
    // Un ítem del pedido. Peso y medidas son del producto embalado y pueden
    // faltar mientras Tierra no los cargue: el cotizador de Andreani tendrá
    // que decidir qué hacer en ese caso (por ejemplo, rechazar la cotización).
    public record Bulto(
            int cantidad,
            Integer pesoGramos,
            Integer altoCm,
            Integer anchoCm,
            Integer largoCm,
            BigDecimal valorUnitario
    ) {}
}

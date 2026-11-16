package com.tierra.ecommerce.enums;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class OrdenCatalogoTest {

    @Test
    void sinOrdenEsPorNombre() {
        assertEquals(OrdenCatalogo.NOMBRE, OrdenCatalogo.desde(null));
        assertEquals(OrdenCatalogo.NOMBRE, OrdenCatalogo.desde(""));
    }

    @Test
    void reconoceLosValoresDeLaUrl() {
        assertEquals(OrdenCatalogo.PRECIO_ASC, OrdenCatalogo.desde("precio_asc"));
        assertEquals(OrdenCatalogo.PRECIO_DESC, OrdenCatalogo.desde("precio_desc"));
    }

    @Test
    void unOrdenDesconocidoSeRechaza() {
        assertThrows(IllegalArgumentException.class, () -> OrdenCatalogo.desde("PRECIO_ASC"));
        assertThrows(IllegalArgumentException.class, () -> OrdenCatalogo.desde("random"));
    }
}

package com.tierra.ecommerce.dto;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class FiltrosCatalogoTest {

    private static FiltrosCatalogo conTexto(String q) {
        return FiltrosCatalogo.de(q, null, null, null, null, null, null, null);
    }

    @Test
    void laBusquedaSeParteEnPalabrasSinTildesNiMayusculas() {
        assertEquals(List.of("campera", "termica"), conTexto("  Campéra   TÉRMICA ").palabras());
    }

    @Test
    void sinTextoNoHayPalabras() {
        assertEquals(List.of(), conTexto(null).palabras());
        assertEquals(List.of(), conTexto("   ").palabras());
    }

    @Test
    void laBusquedaSeAcotaEnLargoYCantidadDePalabras() {
        // 60 caracteres de "a " repetidas y después 200 "b": se corta a los
        // 100 caracteres, así que de las "b" quedan 40, y las "a" repetidas
        // cuentan una sola vez.
        String larga = "a ".repeat(30) + "b".repeat(200);
        assertEquals(List.of("a", "b".repeat(40)), conTexto(larga).palabras());
        List<String> muchas = conTexto("uno dos tres cuatro cinco seis siete ocho nueve diez once doce").palabras();
        assertEquals(FiltrosCatalogo.MAX_PALABRAS, muchas.size());
    }

    @Test
    void unRangoDePrecioAlRevesSeDaVuelta() {
        FiltrosCatalogo f = FiltrosCatalogo.de(null, null, null, null, new BigDecimal("500"), new BigDecimal("100"), null, null);
        assertEquals(new BigDecimal("100"), f.precioMin());
        assertEquals(new BigDecimal("500"), f.precioMax());
    }

    @Test
    void unPrecioNegativoSeRechaza() {
        assertThrows(IllegalArgumentException.class,
                () -> FiltrosCatalogo.de(null, null, null, null, new BigDecimal("-1"), null, null, null));
    }

    @Test
    void talleYColorVaciosSonComoNoFiltrar() {
        FiltrosCatalogo f = FiltrosCatalogo.de(null, null, null, null, null, null, "  ", "");
        assertNull(f.talle());
        assertNull(f.color());
        assertEquals("M", FiltrosCatalogo.de(null, null, null, null, null, null, " M ", null).talle());
    }
}

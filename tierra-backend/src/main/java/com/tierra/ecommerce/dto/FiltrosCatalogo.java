package com.tierra.ecommerce.dto;

import com.tierra.ecommerce.enums.GeneroProducto;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

// Filtros del catálogo (GET /api/productos), ya validados y normalizados.
// Todos son opcionales y se combinan entre sí (Y lógico). El contrato
// completo está en docs/contratos-fase2.md.
public record FiltrosCatalogo(
        // Palabras de la búsqueda, sin tildes y en minúscula. Tienen que
        // aparecer TODAS (en nombre, marca, categoría o descripción).
        List<String> palabras,
        // Incluye las subcategorías: filtrar por "Ropa" trae "Ropa deportiva".
        UUID categoriaId,
        UUID marcaId,
        GeneroProducto genero,
        // Sobre el precio del producto, inclusive.
        BigDecimal precioMin,
        BigDecimal precioMax,
        // Talle y color de una MISMA variante, con stock disponible.
        String talle,
        String color
) {
    // Una búsqueda más larga no es una búsqueda, y cada palabra suma una
    // condición a la consulta: se acota para que nadie la pueda inflar.
    public static final int MAX_LARGO_BUSQUEDA = 100;
    public static final int MAX_PALABRAS = 10;

    public static FiltrosCatalogo de(String q, UUID categoriaId, UUID marcaId, GeneroProducto genero,
                                     BigDecimal precioMin, BigDecimal precioMax, String talle, String color) {
        if ((precioMin != null && precioMin.signum() < 0) || (precioMax != null && precioMax.signum() < 0)) {
            throw new IllegalArgumentException("El precio no puede ser negativo");
        }
        // Un rango al revés (desde 500 hasta 100) se da vuelta en vez de
        // devolver una lista vacía: es lo mismo que hace el frontend.
        if (precioMin != null && precioMax != null && precioMin.compareTo(precioMax) > 0) {
            BigDecimal aux = precioMin;
            precioMin = precioMax;
            precioMax = aux;
        }
        return new FiltrosCatalogo(palabrasDe(q), categoriaId, marcaId, genero,
                precioMin, precioMax, vacioANull(talle), vacioANull(color));
    }

    static List<String> palabrasDe(String q) {
        if (q == null) {
            return List.of();
        }
        String texto = normalizar(q);
        if (texto.length() > MAX_LARGO_BUSQUEDA) {
            texto = texto.substring(0, MAX_LARGO_BUSQUEDA);
        }
        return Arrays.stream(texto.split("\\s+"))
                .filter(p -> !p.isEmpty())
                .distinct()
                .limit(MAX_PALABRAS)
                .toList();
    }

    // Sin tildes ni diéresis y en minúscula: "Campéra" encuentra "campera".
    // La consulta aplica lo mismo a las columnas (ver ProductoEspecificaciones).
    public static String normalizar(String texto) {
        String sinMarcas = Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return sinMarcas.toLowerCase(Locale.ROOT).trim();
    }

    private static String vacioANull(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}

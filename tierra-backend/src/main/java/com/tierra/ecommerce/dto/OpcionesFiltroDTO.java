package com.tierra.ecommerce.dto;

import java.util.List;

// Talles y colores que se pueden elegir en los filtros del catálogo: solo los
// que tienen alguna variante con stock en un producto activo, para que ningún
// filtro lleve a una lista vacía.
public record OpcionesFiltroDTO(List<String> talles, List<String> colores) {}

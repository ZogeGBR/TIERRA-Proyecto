package com.tierra.ecommerce.dto;

import java.util.UUID;

// Lista plana: las subcategorías traen el id de su categoría padre y las
// principales lo traen en null. El frontend arma el árbol si lo necesita.
public record CategoriaDTO(
        UUID id,
        String nombre,
        String slug,
        UUID categoriaPadreId
) {}

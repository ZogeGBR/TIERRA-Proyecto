package com.tierra.ecommerce.dto;

import org.springframework.data.domain.Page;

import java.util.List;

// Una página del catálogo, con el contrato que espera el frontend
// (docs/contratos-fase2.md): nombres en español y la página contada desde 1.
// No se devuelve el Page de Spring tal cual porque su JSON (content, number
// desde 0, pageable, sort...) es un detalle de implementación que cambia
// entre versiones de Spring Data.
public record PaginaDTO<T>(
        List<T> contenido,
        int pagina,
        int tamanio,
        long totalElementos,
        int totalPaginas
) {
    public static <T> PaginaDTO<T> de(Page<T> page) {
        return new PaginaDTO<>(
                page.getContent(),
                page.getNumber() + 1,
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }
}

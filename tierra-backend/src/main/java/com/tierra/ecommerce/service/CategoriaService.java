package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.CategoriaDTO;
import com.tierra.ecommerce.entity.Categoria;
import com.tierra.ecommerce.repository.CategoriaRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class CategoriaService {

    // El id desempata dos categorías con el mismo nombre bajo padres
    // distintos (por ejemplo, dos "Accesorios"): sin él, el orden entre las
    // dos podría cambiar de una consulta a otra.
    static final Sort ORDEN = Sort.by("nombre", "id");

    private final CategoriaRepository categoriaRepository;

    public CategoriaService(CategoriaRepository categoriaRepository) {
        this.categoriaRepository = categoriaRepository;
    }

    // Una sola consulta. El padre de cada subcategoría es otra categoría de
    // la misma lista, que ya está cargada en esta transacción: leerlo no
    // dispara una consulta por fila.
    public List<CategoriaDTO> listar() {
        return categoriaRepository.findAll(ORDEN).stream()
                .map(CategoriaService::aDto)
                .toList();
    }

    private static CategoriaDTO aDto(Categoria categoria) {
        Categoria padre = categoria.getCategoriaPadre();
        UUID padreId = padre == null ? null : padre.getId();
        return new CategoriaDTO(categoria.getId(), categoria.getNombre(), categoria.getSlug(), padreId);
    }
}

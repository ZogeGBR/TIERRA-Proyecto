package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.CategoriaDTO;
import com.tierra.ecommerce.service.CategoriaService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// Público, igual que el catálogo: de acá salen las opciones de los filtros
// y las tarjetas de categorías del inicio.
@RestController
@RequestMapping("/api/categorias")
public class CategoriaController {

    private final CategoriaService categoriaService;

    public CategoriaController(CategoriaService categoriaService) {
        this.categoriaService = categoriaService;
    }

    @GetMapping
    public List<CategoriaDTO> listar() {
        return categoriaService.listar();
    }
}

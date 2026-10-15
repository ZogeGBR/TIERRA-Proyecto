package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.MarcaDTO;
import com.tierra.ecommerce.service.MarcaService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// Público, igual que el catálogo: de acá salen las opciones del filtro de marca.
@RestController
@RequestMapping("/api/marcas")
public class MarcaController {

    private final MarcaService marcaService;

    public MarcaController(MarcaService marcaService) {
        this.marcaService = marcaService;
    }

    @GetMapping
    public List<MarcaDTO> listar() {
        return marcaService.listar();
    }
}

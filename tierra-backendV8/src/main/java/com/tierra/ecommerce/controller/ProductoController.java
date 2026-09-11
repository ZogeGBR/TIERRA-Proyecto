package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.ProductoDetalleDTO;
import com.tierra.ecommerce.dto.ProductoResumenDTO;
import com.tierra.ecommerce.service.ProductoService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    private final ProductoService productoService;

    public ProductoController(ProductoService productoService) {
        this.productoService = productoService;
    }

    @GetMapping
    public List<ProductoResumenDTO> listar(@RequestParam(required = false) UUID categoriaId,
                                            @RequestParam(required = false) UUID marcaId) {
        if (categoriaId != null) {
            return productoService.listarPorCategoria(categoriaId);
        }
        if (marcaId != null) {
            return productoService.listarPorMarca(marcaId);
        }
        return List.of();
    }

    @GetMapping("/{id}")
    public ProductoDetalleDTO detalle(@PathVariable UUID id) {
        return productoService.obtenerDetalle(id);
    }
}

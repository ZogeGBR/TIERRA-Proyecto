package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.FiltrosCatalogo;
import com.tierra.ecommerce.dto.OpcionesFiltroDTO;
import com.tierra.ecommerce.dto.PaginaDTO;
import com.tierra.ecommerce.dto.ProductoDetalleDTO;
import com.tierra.ecommerce.dto.ProductoResumenDTO;
import com.tierra.ecommerce.enums.GeneroProducto;
import com.tierra.ecommerce.enums.OrdenCatalogo;
import com.tierra.ecommerce.service.ProductoService;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.UUID;

// Catálogo público. El contrato (parámetros y respuesta) está en
// docs/contratos-fase2.md.
@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    private final ProductoService productoService;

    public ProductoController(ProductoService productoService) {
        this.productoService = productoService;
    }

    // Sin parámetros devuelve la primera página del catálogo completo.
    @GetMapping
    public PaginaDTO<ProductoResumenDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID categoriaId,
            @RequestParam(required = false) UUID marcaId,
            @RequestParam(required = false) GeneroProducto genero,
            @RequestParam(required = false) BigDecimal precioMin,
            @RequestParam(required = false) BigDecimal precioMax,
            @RequestParam(required = false) String talle,
            @RequestParam(required = false) String color,
            @RequestParam(required = false) String orden,
            @RequestParam(defaultValue = "1") int pagina,
            @RequestParam(defaultValue = "" + ProductoService.TAMANIO_POR_DEFECTO) int tamanio) {
        FiltrosCatalogo filtros = FiltrosCatalogo.de(q, categoriaId, marcaId, genero, precioMin, precioMax, talle, color);
        return productoService.listar(filtros, pagina, tamanio, OrdenCatalogo.desde(orden));
    }

    // Talles y colores para los filtros. Spring elige esta ruta literal antes
    // que /{id}, sin importar el orden en que estén declaradas.
    @GetMapping("/filtros")
    public OpcionesFiltroDTO filtros() {
        return productoService.opcionesDeFiltro();
    }

    @GetMapping("/{id}")
    public ProductoDetalleDTO detalle(@PathVariable UUID id) {
        return productoService.obtenerDetalle(id);
    }
}

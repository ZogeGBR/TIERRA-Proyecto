package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.ProductoDetalleDTO;
import com.tierra.ecommerce.dto.ProductoResumenDTO;
import com.tierra.ecommerce.entity.ImagenProducto;
import com.tierra.ecommerce.entity.Producto;
import com.tierra.ecommerce.entity.VarianteProducto;
import com.tierra.ecommerce.exception.RecursoNoEncontradoException;
import com.tierra.ecommerce.repository.ImagenProductoRepository;
import com.tierra.ecommerce.repository.ProductoRepository;
import com.tierra.ecommerce.repository.VarianteProductoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ProductoService {

    private final ProductoRepository productoRepository;
    private final VarianteProductoRepository varianteRepository;
    private final ImagenProductoRepository imagenRepository;

    public ProductoService(ProductoRepository productoRepository,
                            VarianteProductoRepository varianteRepository,
                            ImagenProductoRepository imagenRepository) {
        this.productoRepository = productoRepository;
        this.varianteRepository = varianteRepository;
        this.imagenRepository = imagenRepository;
    }

    public List<ProductoResumenDTO> listarPorCategoria(UUID categoriaId) {
        return productoRepository.findByCategoriaIdAndActivoTrue(categoriaId)
                .stream()
                .map(this::aResumen)
                .toList();
    }

    public List<ProductoResumenDTO> listarPorMarca(UUID marcaId) {
        return productoRepository.findByMarcaIdAndActivoTrue(marcaId)
                .stream()
                .map(this::aResumen)
                .toList();
    }

    public ProductoDetalleDTO obtenerDetalle(UUID productoId) {
        Producto producto = productoRepository.findById(productoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado: " + productoId));

        List<VarianteProducto> variantes = varianteRepository.findByProductoId(productoId);
        List<ImagenProducto> imagenes = imagenRepository.findByProductoIdOrderByOrdenAsc(productoId);

        return new ProductoDetalleDTO(
                producto.getId(),
                producto.getNombre(),
                producto.getDescripcion(),
                producto.getMarca().getNombre(),
                producto.getCategoria().getNombre(),
                producto.getGenero().name(),
                producto.getPrecio(),
                variantes.stream()
                        .map(v -> new ProductoDetalleDTO.VarianteDTO(v.getId(), v.getSku(), v.getTalla(), v.getColor(), v.getDisponible()))
                        .toList(),
                imagenes.stream().map(ImagenProducto::getUrl).toList()
        );
    }

    private ProductoResumenDTO aResumen(Producto producto) {
        String imagenPrincipal = imagenRepository.findByProductoIdOrderByOrdenAsc(producto.getId())
                .stream()
                .findFirst()
                .map(ImagenProducto::getUrl)
                .orElse(null);

        return new ProductoResumenDTO(
                producto.getId(),
                producto.getNombre(),
                producto.getMarca().getNombre(),
                producto.getCategoria().getNombre(),
                producto.getPrecio(),
                imagenPrincipal
        );
    }
}

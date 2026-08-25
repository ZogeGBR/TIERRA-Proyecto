package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.ImagenProducto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ImagenProductoRepository extends JpaRepository<ImagenProducto, UUID> {
    List<ImagenProducto> findByProductoIdOrderByOrdenAsc(UUID productoId);
}

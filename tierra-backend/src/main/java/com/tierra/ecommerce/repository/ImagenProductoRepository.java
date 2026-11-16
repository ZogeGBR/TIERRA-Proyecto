package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.ImagenProducto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ImagenProductoRepository extends JpaRepository<ImagenProducto, UUID> {

    List<ImagenProducto> findByProductoIdOrderByOrdenAsc(UUID productoId);

    // Las imágenes de TODA una página del catálogo en una sola consulta
    // (hallazgo H-F: antes era una consulta por producto). Ordenadas para que
    // la primera de cada producto sea su imagen principal.
    @Query("SELECT i.producto.id AS productoId, i.url AS url FROM ImagenProducto i "
         + "WHERE i.producto.id IN :productoIds ORDER BY i.orden ASC, i.id ASC")
    List<ImagenDeProducto> findImagenesDe(@Param("productoIds") Collection<UUID> productoIds);

    interface ImagenDeProducto {
        UUID getProductoId();
        String getUrl();
    }
}

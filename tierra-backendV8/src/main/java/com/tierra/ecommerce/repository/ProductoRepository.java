package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.Producto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductoRepository extends JpaRepository<Producto, UUID> {
    List<Producto> findByCategoriaIdAndActivoTrue(UUID categoriaId);
    List<Producto> findByMarcaIdAndActivoTrue(UUID marcaId);
}

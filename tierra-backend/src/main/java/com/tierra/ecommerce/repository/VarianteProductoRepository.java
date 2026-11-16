package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.VarianteProducto;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VarianteProductoRepository extends JpaRepository<VarianteProducto, UUID> {

    List<VarianteProducto> findByProductoId(UUID productoId);

    // Opciones de los filtros del catálogo: talles y colores de variantes con
    // unidades disponibles en productos activos. La condición de stock es la
    // misma que usa el filtro (ProductoEspecificaciones.conStock), así que
    // elegir cualquiera de estas opciones trae al menos un producto.
    @Query("SELECT DISTINCT v.talla FROM VarianteProducto v WHERE v.producto.activo = true "
         + "AND v.talla IS NOT NULL AND (v.controlaStock = false OR v.stock - v.stockReservado > 0)")
    List<String> findTallesConStock();

    @Query("SELECT DISTINCT v.color FROM VarianteProducto v WHERE v.producto.activo = true "
         + "AND v.color IS NOT NULL AND (v.controlaStock = false OR v.stock - v.stockReservado > 0)")
    List<String> findColoresConStock();

    // PESSIMISTIC_WRITE bloquea la fila hasta que termine la transacción: evita que
    // dos compras simultáneas descuenten stock de la misma variante y terminen
    // vendiendo más unidades de las que hay (condición de carrera clásica de e-commerce).
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM VarianteProducto v WHERE v.id = :id")
    Optional<VarianteProducto> findByIdConBloqueo(UUID id);
}

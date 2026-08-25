package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.MovimientoInventario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

// Deliberadamente NO expone ningún método update/delete: esta tabla es
// append-only. Solo save() (que en JPA siempre es INSERT para una
// entidad nueva, sin id) y consultas de lectura.
public interface MovimientoInventarioRepository extends JpaRepository<MovimientoInventario, UUID> {

    List<MovimientoInventario> findByVarianteIdOrderByCreadoEnDesc(UUID varianteId);

    // Reconstruye el stock sumando el libro — sirve para la verificación
    // periódica que compara esto contra variantes_producto.stock_fisico
    // y alerta ante divergencia (ver InventarioService.verificarConsistencia).
    @Query("SELECT COALESCE(SUM(m.cantidad), 0) FROM MovimientoInventario m WHERE m.variante.id = :varianteId")
    Integer sumarMovimientosPorVariante(UUID varianteId);
}

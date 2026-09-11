package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.EquipoAlquiler;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface EquipoAlquilerRepository extends JpaRepository<EquipoAlquiler, UUID> {

    List<EquipoAlquiler> findByTipoIdAndActivoTrue(UUID tipoId);

    // Un equipo está disponible si no tiene ninguna reserva activa (RESERVADO o ENTREGADO)
    // cuyo rango de fechas se superponga con el rango pedido. Esta es la consulta que
    // reemplaza al EXCLUDE constraint de btree_gist mencionado en el schema.sql: sirve
    // para mostrar disponibilidad en el catálogo, pero antes de confirmar la reserva
    // hay que volver a chequearla dentro de la misma transacción (ver ReservaAlquilerService).
    @Query("""
            SELECT e FROM EquipoAlquiler e
            WHERE e.tipo.id = :tipoId
              AND e.activo = true
              AND e.id NOT IN (
                  SELECT ri.equipo.id FROM ReservaItem ri
                  WHERE ri.reserva.estado IN (
                      com.tierra.ecommerce.enums.EstadoReserva.RESERVADO,
                      com.tierra.ecommerce.enums.EstadoReserva.ENTREGADO
                  )
                  AND ri.reserva.fechaInicio <= :fechaFin
                  AND ri.reserva.fechaFin >= :fechaInicio
              )
            """)
    List<EquipoAlquiler> findDisponibles(
            @Param("tipoId") UUID tipoId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin
    );
}

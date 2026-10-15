package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.CodigoAcceso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface CodigoAccesoRepository extends JpaRepository<CodigoAcceso, UUID> {

    // Códigos que todavía podrían servir: ni usados ni invalidados, del más
    // nuevo al más viejo. Como pedir uno nuevo invalida los anteriores, en la
    // práctica hay uno solo; el vencimiento y los intentos los mira el servicio.
    @Query("SELECT c FROM CodigoAcceso c WHERE c.usuario.id = :usuarioId "
         + "AND c.usado = false AND c.invalidado = false ORDER BY c.creadoEn DESC")
    List<CodigoAcceso> findPendientes(@Param("usuarioId") UUID usuarioId);

    // Para el límite de solicitudes: cuántos códigos se generaron desde un
    // momento dado, sin importar si se usaron.
    @Query("SELECT COUNT(c) FROM CodigoAcceso c WHERE c.usuario.id = :usuarioId AND c.creadoEn > :desde")
    long contarDesde(@Param("usuarioId") UUID usuarioId, @Param("desde") LocalDateTime desde);

    @Transactional
    @Modifying(flushAutomatically = true)
    @Query("UPDATE CodigoAcceso c SET c.invalidado = true WHERE c.usuario.id = :usuarioId "
         + "AND c.usado = false AND c.invalidado = false")
    int invalidarPendientes(@Param("usuarioId") UUID usuarioId);

    // Limpieza diaria. El límite de solicitudes mira solo las últimas 24
    // horas, así que no hace falta guardar códigos más viejos que eso.
    @Transactional
    @Modifying
    @Query("DELETE FROM CodigoAcceso c WHERE c.creadoEn < :limite")
    int borrarAnterioresA(@Param("limite") LocalDateTime limite);
}

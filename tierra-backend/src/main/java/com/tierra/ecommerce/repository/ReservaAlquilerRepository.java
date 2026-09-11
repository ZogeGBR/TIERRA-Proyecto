package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.ReservaAlquiler;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReservaAlquilerRepository extends JpaRepository<ReservaAlquiler, UUID> {
    List<ReservaAlquiler> findByUsuarioIdOrderByFechaInicioDesc(UUID usuarioId);
}

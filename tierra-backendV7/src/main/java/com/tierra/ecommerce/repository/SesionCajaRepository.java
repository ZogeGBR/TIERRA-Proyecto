package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.SesionCaja;
import com.tierra.ecommerce.enums.EstadoSesionCaja;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SesionCajaRepository extends JpaRepository<SesionCaja, UUID> {
    // Para validar que no se abra una segunda sesión activa con el mismo usuario.
    Optional<SesionCaja> findByUsuarioIdAndEstado(UUID usuarioId, EstadoSesionCaja estado);
}

package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.Ubicacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UbicacionRepository extends JpaRepository<Ubicacion, UUID> {
    // Resuelve la ubicación de origen para despachos web. Simple mientras
    // haya un solo depósito; con más de una ubicación esto pasa a ser una
    // decisión real (¿desde qué depósito se despacha según el pedido?),
    // no una consulta trivial.
    Optional<Ubicacion> findFirstByTipo(String tipo);
}

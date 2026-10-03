package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.Direccion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DireccionRepository extends JpaRepository<Direccion, UUID> {

    // Para decidir si la dirección que se está por crear en el checkout es
    // la primera del usuario (y por lo tanto la predeterminada).
    boolean existsByUsuarioId(UUID usuarioId);
}

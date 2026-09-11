package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.Cupon;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CuponRepository extends JpaRepository<Cupon, UUID> {
    Optional<Cupon> findByCodigo(String codigo);
}

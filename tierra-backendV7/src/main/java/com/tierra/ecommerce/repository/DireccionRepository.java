package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.Direccion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DireccionRepository extends JpaRepository<Direccion, UUID> {
}

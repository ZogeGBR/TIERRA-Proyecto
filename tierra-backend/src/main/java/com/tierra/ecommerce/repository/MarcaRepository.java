package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.Marca;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface MarcaRepository extends JpaRepository<Marca, UUID> {
}

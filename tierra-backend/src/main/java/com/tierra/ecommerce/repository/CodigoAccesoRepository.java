package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.CodigoAcceso;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

// Las consultas (código vigente, solicitudes recientes, limpieza) se agregan
// en la tarea 3, junto con el servicio que las usa y sus tests.
public interface CodigoAccesoRepository extends JpaRepository<CodigoAcceso, UUID> {
}

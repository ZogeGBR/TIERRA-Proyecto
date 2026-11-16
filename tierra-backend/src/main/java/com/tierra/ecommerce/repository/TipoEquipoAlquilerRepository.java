package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.TipoEquipoAlquiler;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TipoEquipoAlquilerRepository extends JpaRepository<TipoEquipoAlquiler, UUID> {

    // Los que se muestran en la página de alquiler: los que tienen precio.
    // El nombre es único, así que el orden no necesita desempate.
    List<TipoEquipoAlquiler> findByPrecioDiaIsNotNullOrderByNombre();
}

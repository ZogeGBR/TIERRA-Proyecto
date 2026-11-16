package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.Producto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

public interface ProductoRepository extends JpaRepository<Producto, UUID>, JpaSpecificationExecutor<Producto> {

    // La página del catálogo trae la marca y la categoría en la misma
    // consulta: el resumen de cada producto las muestra, y como son LAZY,
    // sin esto serían consultas extra por cada marca y categoría distinta.
    // La consulta de conteo de la página no lleva el EntityGraph.
    @Override
    @EntityGraph(attributePaths = {"marca", "categoria"})
    Page<Producto> findAll(Specification<Producto> spec, Pageable pageable);
}

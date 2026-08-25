package com.tierra.ecommerce.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.util.UUID;

// Existe desde el día uno aunque hoy haya un solo local (Esquel).
// Agregar multi-ubicación después obligaría a migrar todo el historial
// de movimientos ya cargado en movimientos_inventario.
@Entity
@Table(name = "ubicaciones")
@Getter
@Setter
@NoArgsConstructor
public class Ubicacion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, length = 20)
    private String tipo = "local"; // 'local' | 'deposito'
}

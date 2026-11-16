package com.tierra.ecommerce.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "tipos_equipo_alquiler")
@Getter
@Setter
@NoArgsConstructor
public class TipoEquipoAlquiler {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // ej: esquís, tabla de snowboard, botas de esquí, bastones, casco, antiparras
    @Column(nullable = false, unique = true, length = 50)
    private String nombre;

    // Precio por día de una unidad, para el estimador de la página de
    // alquiler (V14). Sin precio, el tipo no se muestra.
    @Column(name = "precio_dia", precision = 12, scale = 2)
    private BigDecimal precioDia;
}

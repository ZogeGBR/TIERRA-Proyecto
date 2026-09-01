package com.tierra.ecommerce.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "tarifas_temporada")
@Getter
@Setter
@NoArgsConstructor
public class TarifaTemporada {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tipo_id", nullable = false)
    private TipoEquipoAlquiler tipo;

    // ej. "Invierno 2026"
    @Column(nullable = false, length = 50)
    private String temporada;

    @Column(name = "precio_dia", nullable = false, precision = 12, scale = 2)
    private BigDecimal precioDia;

    @Column(name = "precio_semana", precision = 12, scale = 2)
    private BigDecimal precioSemana;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin", nullable = false)
    private LocalDate fechaFin;
}

package com.tierra.ecommerce.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "reserva_items")
@Getter
@Setter
@NoArgsConstructor
public class ReservaItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reserva_id", nullable = false)
    private ReservaAlquiler reserva;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipo_id", nullable = false)
    private EquipoAlquiler equipo;

    @Column(name = "precio_dia_aplicado", nullable = false, precision = 12, scale = 2)
    private BigDecimal precioDiaAplicado;

    // La aplicación solo escribe estas dos columnas. 'periodo' (daterange)
    // es GENERATED ALWAYS en la base a partir de estas — Postgres la
    // calcula sola, JPA ni la mapea, pero es la que usa el EXCLUDE que
    // impide reservar dos veces el mismo equipo en fechas que se pisan.
    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin", nullable = false)
    private LocalDate fechaFin;
}

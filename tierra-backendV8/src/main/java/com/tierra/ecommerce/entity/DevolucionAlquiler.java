package com.tierra.ecommerce.entity;

import com.tierra.ecommerce.enums.CondicionEquipo;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "devoluciones_alquiler")
@Getter
@Setter
@NoArgsConstructor
public class DevolucionAlquiler {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reserva_item_id", nullable = false)
    private ReservaItem reservaItem;

    @Column(name = "fecha_devolucion", nullable = false)
    private LocalDateTime fechaDevolucion = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "condicion_devuelta", nullable = false)
    private CondicionEquipo condicionDevuelta;

    @Column(name = "cargo_por_dano", nullable = false, precision = 12, scale = 2)
    private BigDecimal cargoPorDano = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String observaciones;
}

package com.tierra.ecommerce.entity;

import com.tierra.ecommerce.enums.EstadoSesionCaja;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

// Vincula cada venta presencial con un turno y un vendedor. Es la base
// del arqueo: sin esto, un faltante de caja no se puede rastrear a nadie.
@Entity
@Table(name = "sesiones_caja")
@Getter
@Setter
@NoArgsConstructor
public class SesionCaja {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ubicacion_id", nullable = false)
    private Ubicacion ubicacion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoSesionCaja estado = EstadoSesionCaja.ABIERTA;

    @Column(name = "monto_inicial", nullable = false, precision = 12, scale = 2)
    private BigDecimal montoInicial = BigDecimal.ZERO;

    @Column(name = "monto_final", precision = 12, scale = 2)
    private BigDecimal montoFinal;

    @Column(name = "abierta_en", nullable = false)
    private LocalDateTime abiertaEn = LocalDateTime.now();

    @Column(name = "cerrada_en")
    private LocalDateTime cerradaEn;
}

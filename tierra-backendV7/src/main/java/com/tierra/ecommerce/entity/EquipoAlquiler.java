package com.tierra.ecommerce.entity;

import com.tierra.ecommerce.enums.CondicionEquipo;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "equipos_alquiler")
@Getter
@Setter
@NoArgsConstructor
public class EquipoAlquiler {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tipo_id", nullable = false)
    private TipoEquipoAlquiler tipo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "marca_id")
    private Marca marca;

    @Column(length = 100)
    private String modelo;

    // largo de esquí en cm, talle de bota, etc.
    @Column(length = 20)
    private String talla;

    @Column(name = "numero_serie", unique = true, length = 50)
    private String numeroSerie;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CondicionEquipo condicion = CondicionEquipo.BUENO;

    @Column(name = "precio_dia", nullable = false, precision = 12, scale = 2)
    private BigDecimal precioDia;

    @Column(name = "deposito_garantia", nullable = false, precision = 12, scale = 2)
    private BigDecimal depositoGarantia;

    @Column(nullable = false)
    private boolean activo = true;
}

package com.tierra.ecommerce.entity;

import com.tierra.ecommerce.enums.EstadoEnvio;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "envios")
@Getter
@Setter
@NoArgsConstructor
public class Envio {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pedido_id", nullable = false)
    private Pedido pedido;

    @Column(length = 50)
    private String transportista;

    @Column(name = "numero_seguimiento", length = 100)
    private String numeroSeguimiento;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal costo = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoEnvio estado = EstadoEnvio.PENDIENTE;

    @Column(name = "fecha_estimada")
    private LocalDate fechaEstimada;
}

package com.tierra.ecommerce.entity;

import com.tierra.ecommerce.enums.EstadoPago;
import com.tierra.ecommerce.enums.MetodoPago;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

// Puede asociarse a un Pedido (venta) o a una ReservaAlquiler (alquiler),
// nunca a los dos a la vez (ver constraint CHECK en el schema SQL).
// Nunca se guardan datos de tarjeta acá: mpPaymentId es el id que
// devuelve Mercado Pago una vez procesado el pago en sus servidores.
@Entity
@Table(name = "pagos")
@Getter
@Setter
@NoArgsConstructor
public class Pago {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pedido_id")
    private Pedido pedido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reserva_id")
    private ReservaAlquiler reserva;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MetodoPago metodo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoPago estado = EstadoPago.PENDIENTE;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal monto;

    @Column(name = "mp_payment_id", length = 100)
    private String mpPaymentId;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();
}

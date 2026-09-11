package com.tierra.ecommerce.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

// Reserva temporal del carrito, con vencimiento. Mientras existe una fila
// acá con liberada=false, esa cantidad está descontada del "disponible
// para vender" (stock - stockReservado) pero no del stock real. Se
// resuelve de dos formas: ReservaStockLiberadorJob la libera si expira sin
// pagarse, o InventarioService.confirmarVenta la convierte en descuento
// real cuando el pago se aprueba.
@Entity
@Table(name = "reservas_stock")
@Getter
@Setter
@NoArgsConstructor
public class ReservaStock {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variante_id", nullable = false)
    private VarianteProducto variante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pedido_id")
    private Pedido pedido;

    @Column(nullable = false)
    private int cantidad;

    @Column(name = "expira_en", nullable = false)
    private LocalDateTime expiraEn;

    @Column(nullable = false)
    private boolean liberada = false;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();
}

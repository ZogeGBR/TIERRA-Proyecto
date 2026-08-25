package com.tierra.ecommerce.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "variantes_producto")
@Getter
@Setter
@NoArgsConstructor
public class VarianteProducto {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Column(nullable = false, unique = true, length = 50)
    private String sku;

    @Column(length = 20)
    private String talla;

    @Column(length = 50)
    private String color;

    // CACHÉ, no fuente de verdad: la actualiza InventarioService cuando
    // inserta un movimiento en movimientos_inventario. stockFisico es lo
    // que hay en la ubicación; stockReservado es lo que el carrito web
    // tiene bloqueado con TTL (ver ReservaStock). Nunca se tocan estos
    // campos con un simple setter + save() fuera de InventarioService.
    @Column(name = "stock_fisico", nullable = false)
    private int stockFisico = 0;

    @Column(name = "stock_reservado", nullable = false)
    private int stockReservado = 0;

    @Column(name = "precio_adicional", nullable = false, precision = 12, scale = 2)
    private BigDecimal precioAdicional = BigDecimal.ZERO;

    @Transient
    public int getDisponible() {
        return stockFisico - stockReservado;
    }
}

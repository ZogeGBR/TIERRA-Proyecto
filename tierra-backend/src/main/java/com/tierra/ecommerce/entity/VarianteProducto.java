package com.tierra.ecommerce.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

// El stock de acá es EXCLUSIVO de la venta online — el local usa su propio
// sistema (Andino) y es intencional que no estén sincronizados: el dueño
// fue explícito en que quiere los dos inventarios separados.
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

    // CACHÉ mantenida por InventarioService, no se toca directamente desde
    // otros servicios. stockReservado es lo que el carrito tiene bloqueado
    // con TTL mientras el pago no se confirma (ver ReservaStock).
    @Column(nullable = false)
    private int stock = 0;

    @Column(name = "stock_reservado", nullable = false)
    private int stockReservado = 0;

    @Column(name = "precio_adicional", nullable = false, precision = 12, scale = 2)
    private BigDecimal precioAdicional = BigDecimal.ZERO;

    @Transient
    public int getDisponible() {
        return stock - stockReservado;
    }
}

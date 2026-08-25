package com.tierra.ecommerce.entity;

import com.tierra.ecommerce.enums.CanalVenta;
import com.tierra.ecommerce.enums.TipoMovimientoInventario;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

// Asiento append-only: NUNCA se hace UPDATE ni DELETE sobre esta tabla,
// solo INSERT. El stock de una variante es, por definición, la suma de
// sus movimientos — variantes_producto.stock_fisico es una caché que
// InventarioService mantiene, pero esta tabla es la fuente de verdad.
// No se expone ningún método de repositorio para editar ni borrar filas
// (ver MovimientoInventarioRepository: solo save() para insertar y
// consultas de lectura).
@Entity
@Table(name = "movimientos_inventario")
@Getter
@Setter
@NoArgsConstructor
public class MovimientoInventario {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variante_id", nullable = false)
    private VarianteProducto variante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ubicacion_id", nullable = false)
    private Ubicacion ubicacion;

    // Con signo: positivo = ingreso, negativo = egreso.
    @Column(nullable = false)
    private int cantidad;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoMovimientoInventario tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CanalVenta canal;

    // Obligatorio a nivel de aplicación cuando tipo = AJUSTE (ver
    // InventarioService.ajusteManual) — sin usuario y motivo forzados,
    // "ajuste" se convierte en el agujero por donde desaparece mercadería.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(columnDefinition = "TEXT")
    private String motivo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referencia_pedido_id")
    private Pedido referenciaPedido;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();
}

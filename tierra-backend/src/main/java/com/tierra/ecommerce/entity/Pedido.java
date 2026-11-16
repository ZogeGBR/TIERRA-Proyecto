package com.tierra.ecommerce.entity;

import com.tierra.ecommerce.enums.EstadoPedido;
import com.tierra.ecommerce.enums.TipoEntrega;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

// Pedidos de la tienda online exclusivamente — el local factura por su
// cuenta con su propio sistema, no comparte esta tabla.
@Entity
@Table(name = "pedidos")
@Getter
@Setter
@NoArgsConstructor
public class Pedido {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_entrega", nullable = false)
    private TipoEntrega tipoEntrega = TipoEntrega.ENVIO_DOMICILIO;

    @Embedded
    private DireccionEntrega direccionEntrega;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cupon_id")
    private Cupon cupon;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoPedido estado = EstadoPedido.PENDIENTE;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal descuento = BigDecimal.ZERO;

    @Column(name = "costo_envio", nullable = false, precision = 12, scale = 2)
    private BigDecimal costoEnvio = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    // Contacto del destinatario, copiado en el pedido (ADR 0005). No sale de
    // la cuenta ni la modifica: puede ser otra persona (un regalo), y quien
    // compra sin sesión pudo haber escrito el email de otro.
    @Column(name = "contacto_nombre", nullable = false, length = 150)
    private String contactoNombre;

    @Column(name = "contacto_telefono", length = 30)
    private String contactoTelefono;

    // Solo con envío a domicilio: lo pide el correo para entregar.
    @Column(name = "contacto_dni", length = 20)
    private String contactoDni;
}

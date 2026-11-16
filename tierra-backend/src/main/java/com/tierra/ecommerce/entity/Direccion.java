package com.tierra.ecommerce.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.util.UUID;

// La dirección guardada de un cliente para la próxima compra (tarea 22, ADR
// 0005). Hay una sola por cliente (índice único, V11), y solo la escribe el
// checkout con sesión de cliente y la casilla tildada. Ningún pedido apunta a
// esta tabla: cada pedido copia su dirección (DireccionEntrega).
@Entity
@Table(name = "direcciones")
@Getter
@Setter
@NoArgsConstructor
public class Direccion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, length = 200)
    private String calle;

    @Column(length = 20)
    private String numero;

    @Column(length = 10)
    private String piso;

    @Column(length = 10)
    private String departamento;

    @Column(nullable = false, length = 100)
    private String ciudad;

    @Column(nullable = false, length = 100)
    private String provincia;

    @Column(name = "codigo_postal", nullable = false, length = 20)
    private String codigoPostal;

    @Column(name = "es_predeterminada", nullable = false)
    private boolean esPredeterminada = false;
}

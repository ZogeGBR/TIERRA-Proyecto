package com.tierra.ecommerce.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "imagenes_producto")
@Getter
@Setter
@NoArgsConstructor
public class ImagenProducto {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    // TEXT en la base (ver schema): puede llevar ilustraciones vectoriales
    // embebidas como data:image/svg+xml,... que superan los 255 caracteres.
    @Column(nullable = false, columnDefinition = "TEXT")
    private String url;

    @Column(nullable = false)
    private int orden = 0;
}

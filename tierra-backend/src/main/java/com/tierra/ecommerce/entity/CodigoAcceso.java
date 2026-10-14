package com.tierra.ecommerce.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

// Un código de seis dígitos enviado a un cliente para que entre a ver sus
// pedidos (ADR 0005). La lógica que los genera, verifica y limita vive en
// CodigoAccesoService (tarea 3); esta clase solo mapea la tabla.
//
// El código nunca se guarda: codigoHash es su HMAC-SHA256 con una clave
// del servidor, en hexadecimal. Ver el ADR para el porqué.
@Entity
@Table(name = "codigos_acceso")
@Getter
@Setter
@NoArgsConstructor
public class CodigoAcceso {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "codigo_hash", nullable = false, length = 64)
    private String codigoHash;

    @Column(name = "expira_en", nullable = false)
    private LocalDateTime expiraEn;

    // Verificaciones fallidas de este código. Al llegar al máximo
    // configurado, el código queda agotado aunque después llegue el correcto.
    @Column(nullable = false)
    private int intentos = 0;

    @Column(nullable = false)
    private boolean usado = false;

    // Se marca cuando el cliente pide un código nuevo: hay uno solo vigente.
    @Column(nullable = false)
    private boolean invalidado = false;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();
}

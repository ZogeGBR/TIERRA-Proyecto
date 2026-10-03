package com.tierra.ecommerce.entity;

import com.tierra.ecommerce.enums.RolUsuario;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "usuarios")
@Getter
@Setter
@NoArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(length = 30)
    private String telefono;

    // Antes quedaba huérfano (ver docs/decisiones/0001): sin uso porque el
    // módulo de alquiler que lo pedía estaba congelado. Con la 0005 vuelve a
    // tener un propósito: el checkout con cuenta implícita lo pide junto con
    // nombre y email. Sigue sin exponerse en UsuarioResponse -- no hay
    // ningún motivo para que el frontend lo necesite de vuelta.
    @Column(length = 20)
    private String dni;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RolUsuario rol = RolUsuario.CLIENTE;

    // Mapea a UserDetails.isEnabled(). Una cuenta con activo=false no
    // puede iniciar sesión, pero conserva su historial de pedidos.
    @Column(nullable = false)
    private boolean activo = true;

    // Bloqueo por intentos fallidos. Mapean a isAccountNonLocked():
    // con eso, el bloqueo lo aplica Spring Security solo.
    @Column(name = "intentos_fallidos", nullable = false)
    private int intentosFallidos = 0;

    @Column(name = "bloqueado_hasta")
    private LocalDateTime bloqueadoHasta;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();
}

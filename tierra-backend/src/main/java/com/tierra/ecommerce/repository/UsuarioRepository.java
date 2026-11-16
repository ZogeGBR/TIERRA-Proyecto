package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.Usuario;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {
    Optional<Usuario> findByEmail(String email);

    // Bloquea la fila del usuario hasta el fin de la transacción. Lo usa el
    // acceso por código: sin el bloqueo, dos verificaciones simultáneas del
    // mismo código podrían aceptarse las dos, y dos pedidos simultáneos
    // podrían pasar el límite de solicitudes.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM Usuario u WHERE u.email = :email")
    Optional<Usuario> findByEmailConBloqueo(@Param("email") String email);

    // Crea un cliente sin contraseña (ADR 0005), o no hace nada si el email ya
    // existe. Lo usa el checkout: dos compras simultáneas con el mismo email
    // nuevo intentan crear el mismo cliente, y sin ON CONFLICT la segunda
    // chocaría con el UNIQUE y terminaría en un error 500. Con ON CONFLICT,
    // la segunda espera a la primera y después lee el cliente que ya existe.
    //
    // Devuelve cuántas filas insertó (0 o 1). El email tiene que llegar ya
    // normalizado (AuthService.normalizarEmail).
    @Modifying
    @Query(value = "INSERT INTO usuarios (id, nombre, email, rol) VALUES (:id, :nombre, :email, 'CLIENTE') "
                 + "ON CONFLICT (email) DO NOTHING", nativeQuery = true)
    int insertarClienteSiNoExiste(@Param("id") UUID id, @Param("nombre") String nombre, @Param("email") String email);
}

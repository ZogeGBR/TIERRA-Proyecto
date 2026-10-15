package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.Usuario;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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
}

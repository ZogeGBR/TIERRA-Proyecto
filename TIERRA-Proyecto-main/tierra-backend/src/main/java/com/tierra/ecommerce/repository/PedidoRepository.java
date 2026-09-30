package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.Pedido;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PedidoRepository extends JpaRepository<Pedido, UUID> {
    List<Pedido> findByUsuarioIdOrderByCreadoEnDesc(UUID usuarioId);

    // Bloquea la fila del pedido hasta que termine la transacción. Todo lo que
    // cambia el estado de pago de un pedido (webhook, job de vencimientos,
    // creación de la preferencia) pasa por acá: así dos notificaciones
    // simultáneas del mismo pedido se procesan en fila y nunca en paralelo.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Pedido p WHERE p.id = :id")
    Optional<Pedido> findByIdConBloqueo(UUID id);

    // Pedidos que siguen PENDIENTE pero ya no tienen stock reservado (por ejemplo,
    // creados antes de que existiera la conciliación): el job los cierra igual
    // para que no quede ningún pedido ni pago pendiente colgado.
    @Query("SELECT p.id FROM Pedido p WHERE p.estado = com.tierra.ecommerce.enums.EstadoPedido.PENDIENTE " +
           "AND p.creadoEn < :limite AND NOT EXISTS (" +
           "SELECT r FROM ReservaStock r WHERE r.pedido = p AND r.liberada = false)")
    List<UUID> findPendientesSinReservasActivas(LocalDateTime limite);
}

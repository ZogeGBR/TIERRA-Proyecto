package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.Pedido;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PedidoRepository extends JpaRepository<Pedido, UUID> {
    // El historial de un cliente (tarea 19): sus pedidos, del más nuevo al más
    // viejo, sin los cancelados que nunca se pagaron (un link de pago que
    // falló o un pedido abandonado: el cliente no los vive como compras). Un
    // cancelado que se había pagado (y se reembolsó) sí aparece. Desempata
    // por id, así el orden es siempre el mismo.
    @Query("SELECT p FROM Pedido p WHERE p.usuario.id = :usuarioId "
         + "AND (p.estado <> com.tierra.ecommerce.enums.EstadoPedido.CANCELADO OR EXISTS ("
         + "  SELECT g FROM Pago g WHERE g.pedido = p AND g.estado IN ("
         + "    com.tierra.ecommerce.enums.EstadoPago.APROBADO, com.tierra.ecommerce.enums.EstadoPago.REEMBOLSADO))) "
         + "ORDER BY p.creadoEn DESC, p.id DESC")
    List<Pedido> findHistorial(@Param("usuarioId") UUID usuarioId, Pageable pagina);

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

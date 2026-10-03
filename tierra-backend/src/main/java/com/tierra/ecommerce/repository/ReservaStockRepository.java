package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.ReservaStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface ReservaStockRepository extends JpaRepository<ReservaStock, UUID> {

    List<ReservaStock> findByPedidoId(UUID pedidoId);

    @Query("SELECT r FROM ReservaStock r WHERE r.liberada = false AND r.expiraEn < :ahora")
    List<ReservaStock> findVencidasNoLiberadas(LocalDateTime ahora);

    // Pedidos con al menos una reserva vencida sin liberar: el job los resuelve
    // de a uno (conciliar con Mercado Pago antes de soltar el stock).
    @Query("SELECT DISTINCT r.pedido.id FROM ReservaStock r " +
           "WHERE r.liberada = false AND r.expiraEn < :ahora AND r.pedido IS NOT NULL")
    List<UUID> findPedidosConReservasVencidas(LocalDateTime ahora);

    @Query("SELECT r FROM ReservaStock r " +
           "WHERE r.liberada = false AND r.expiraEn < :ahora AND r.pedido IS NULL")
    List<ReservaStock> findVencidasNoLiberadasSinPedido(LocalDateTime ahora);
}

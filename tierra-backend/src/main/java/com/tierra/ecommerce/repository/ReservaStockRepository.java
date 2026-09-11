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
}

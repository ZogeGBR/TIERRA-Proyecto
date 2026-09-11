package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PedidoRepository extends JpaRepository<Pedido, UUID> {
    List<Pedido> findByUsuarioIdOrderByCreadoEnDesc(UUID usuarioId);
}

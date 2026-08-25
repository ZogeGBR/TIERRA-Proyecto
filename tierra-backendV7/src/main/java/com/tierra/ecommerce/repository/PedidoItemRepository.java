package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.PedidoItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PedidoItemRepository extends JpaRepository<PedidoItem, UUID> {
}

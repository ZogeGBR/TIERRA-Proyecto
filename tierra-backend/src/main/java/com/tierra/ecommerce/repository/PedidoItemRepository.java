package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.PedidoItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface PedidoItemRepository extends JpaRepository<PedidoItem, UUID> {

    // Los ítems de varios pedidos en una sola consulta (el historial), así no
    // se hace una por pedido. Usa solo la copia guardada en el ítem: no toca
    // productos ni variantes.
    @Query("SELECT i FROM PedidoItem i WHERE i.pedido.id IN :pedidos "
         + "ORDER BY i.nombreProducto, i.talla, i.color, i.id")
    List<PedidoItem> findDePedidos(@Param("pedidos") Collection<UUID> pedidos);
}

package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.PedidoItem;
import com.tierra.ecommerce.enums.EstadoPedido;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
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

    // "Más vendidos" de la home: los productos activos con más unidades
    // vendidas en pedidos con alguno de esos estados, creados desde esa
    // fecha. Empates por nombre y después por id, así el orden es estable.
    @Query("SELECT pr.id FROM PedidoItem i JOIN i.pedido p JOIN i.variante v JOIN v.producto pr "
         + "WHERE p.estado IN :estados AND p.creadoEn >= :desde AND pr.activo = true "
         + "GROUP BY pr.id, pr.nombre ORDER BY SUM(i.cantidad) DESC, pr.nombre, pr.id")
    List<UUID> findMasVendidos(@Param("estados") Collection<EstadoPedido> estados,
                               @Param("desde") LocalDateTime desde, Pageable pagina);
}

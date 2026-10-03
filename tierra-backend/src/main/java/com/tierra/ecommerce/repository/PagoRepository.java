package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.Pago;
import com.tierra.ecommerce.enums.EstadoPago;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PagoRepository extends JpaRepository<Pago, UUID> {

    Optional<Pago> findByMpPaymentId(String mpPaymentId);

    // El "lugar" que deja crearPreferenciaPago: un Pago PENDIENTE del pedido que
    // todavía no está atado a ningún pago de Mercado Pago. Se reutiliza en vez de
    // crear uno nuevo cada vez que el usuario vuelve a apretar "Pagar".
    Optional<Pago> findFirstByPedido_IdAndEstadoAndMpPaymentIdIsNull(UUID pedidoId, EstadoPago estado);

    List<Pago> findByPedido_IdAndEstado(UUID pedidoId, EstadoPago estado);
}

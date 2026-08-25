package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.Pago;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PagoRepository extends JpaRepository<Pago, UUID> {
    Optional<Pago> findByMpPaymentId(String mpPaymentId);
}

package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.ReservaItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ReservaItemRepository extends JpaRepository<ReservaItem, UUID> {
}

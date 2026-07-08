package com.logistics.inventoryservice.infrastructure.persistence.repository;

import com.logistics.inventoryservice.infrastructure.persistence.entity.StockReservationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface StockReservationJpaRepository extends JpaRepository<StockReservationEntity, UUID> {
    Optional<StockReservationEntity> findByOrderId(UUID orderId);
    boolean existsByOrderId(UUID orderId);
}

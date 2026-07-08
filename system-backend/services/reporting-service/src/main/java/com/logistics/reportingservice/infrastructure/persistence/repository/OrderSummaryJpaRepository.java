package com.logistics.reportingservice.infrastructure.persistence.repository;

import com.logistics.reportingservice.infrastructure.persistence.entity.OrderSummaryEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OrderSummaryJpaRepository extends JpaRepository<OrderSummaryEntity, UUID> {

    Page<OrderSummaryEntity> findAllByWarehouseId(UUID warehouseId, Pageable pageable);

    Optional<OrderSummaryEntity> findByOrderId(UUID orderId);
}

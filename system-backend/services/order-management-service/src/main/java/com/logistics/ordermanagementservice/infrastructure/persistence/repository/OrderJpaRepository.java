package com.logistics.ordermanagementservice.infrastructure.persistence.repository;

import com.logistics.ordermanagementservice.infrastructure.persistence.entity.OrderEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OrderJpaRepository extends JpaRepository<OrderEntity, UUID> {

    Page<OrderEntity> findAllByStatus(String status, Pageable pageable);

    Page<OrderEntity> findAllByWarehouseId(UUID warehouseId, Pageable pageable);

    Page<OrderEntity> findAllByWarehouseIdAndStatus(UUID warehouseId, String status, Pageable pageable);

    Page<OrderEntity> findAllByCustomerId(UUID customerId, Pageable pageable);

    Optional<OrderEntity> findByOrderIdAndCompanyId(UUID orderId, UUID companyId);

    Page<OrderEntity> findAllByCompanyId(UUID companyId, Pageable pageable);

    Page<OrderEntity> findAllByCompanyIdAndStatus(UUID companyId, String status, Pageable pageable);

    Page<OrderEntity> findAllByCompanyIdAndWarehouseId(UUID companyId, UUID warehouseId, Pageable pageable);

    Page<OrderEntity> findAllByCompanyIdAndWarehouseIdAndStatus(UUID companyId, UUID warehouseId, String status, Pageable pageable);

    boolean existsByOrderIdAndCompanyId(UUID orderId, UUID companyId);
}

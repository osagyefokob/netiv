package com.logistics.ordermanagementservice.infrastructure.persistence.repository;

import com.logistics.ordermanagementservice.infrastructure.persistence.entity.OrderAssignmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OrderAssignmentJpaRepository extends JpaRepository<OrderAssignmentEntity, UUID> {

    Optional<OrderAssignmentEntity> findByOrderId(UUID orderId);
}

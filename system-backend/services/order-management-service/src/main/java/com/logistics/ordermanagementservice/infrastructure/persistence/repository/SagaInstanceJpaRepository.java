package com.logistics.ordermanagementservice.infrastructure.persistence.repository;

import com.logistics.ordermanagementservice.infrastructure.persistence.entity.SagaInstanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SagaInstanceJpaRepository extends JpaRepository<SagaInstanceEntity, UUID> {

    Optional<SagaInstanceEntity> findByCorrelationId(UUID correlationId);
}

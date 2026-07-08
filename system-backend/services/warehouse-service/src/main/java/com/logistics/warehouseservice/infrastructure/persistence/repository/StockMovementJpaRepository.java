package com.logistics.warehouseservice.infrastructure.persistence.repository;

import com.logistics.warehouseservice.infrastructure.persistence.entity.StockMovementEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface StockMovementJpaRepository extends JpaRepository<StockMovementEntity, UUID> {

    Page<StockMovementEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);
}

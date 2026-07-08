package com.logistics.warehouseservice.infrastructure.persistence.repository;

import com.logistics.warehouseservice.infrastructure.persistence.entity.WarehouseEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface WarehouseJpaRepository extends JpaRepository<WarehouseEntity, UUID> {
    Page<WarehouseEntity> findAllByIsActiveTrue(Pageable pageable);

    Page<WarehouseEntity> findAllByCompanyIdAndIsActiveTrue(UUID companyId, Pageable pageable);

    Optional<WarehouseEntity> findByWarehouseIdAndCompanyId(UUID warehouseId, UUID companyId);
}

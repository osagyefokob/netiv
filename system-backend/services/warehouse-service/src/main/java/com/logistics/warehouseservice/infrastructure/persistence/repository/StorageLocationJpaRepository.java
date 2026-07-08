package com.logistics.warehouseservice.infrastructure.persistence.repository;

import com.logistics.warehouseservice.infrastructure.persistence.entity.StorageLocationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StorageLocationJpaRepository extends JpaRepository<StorageLocationEntity, UUID> {
    List<StorageLocationEntity> findAllByWarehouseId(UUID warehouseId);

    List<StorageLocationEntity> findAllByWarehouseIdAndIsActiveTrue(UUID warehouseId);
}

package com.logistics.reportingservice.infrastructure.persistence.repository;

import com.logistics.reportingservice.infrastructure.persistence.entity.InventorySnapshotEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface InventorySnapshotJpaRepository extends JpaRepository<InventorySnapshotEntity, UUID> {

    Page<InventorySnapshotEntity> findAllByProductId(UUID productId, Pageable pageable);

    Page<InventorySnapshotEntity> findAllByWarehouseId(UUID warehouseId, Pageable pageable);

    Page<InventorySnapshotEntity> findAllByProductIdAndWarehouseId(UUID productId, UUID warehouseId, Pageable pageable);
}

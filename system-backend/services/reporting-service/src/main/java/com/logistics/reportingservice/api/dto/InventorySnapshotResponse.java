package com.logistics.reportingservice.api.dto;

import com.logistics.reportingservice.infrastructure.persistence.entity.InventorySnapshotEntity;

import java.time.Instant;
import java.util.UUID;

public record InventorySnapshotResponse(
    UUID snapshotId,
    UUID productId,
    UUID warehouseId,
    UUID locationId,
    int totalQuantity,
    int reservedQuantity,
    int availableQuantity,
    Instant snapshotAt
) {
    public static InventorySnapshotResponse from(InventorySnapshotEntity e) {
        return new InventorySnapshotResponse(
            e.getSnapshotId(),
            e.getProductId(),
            e.getWarehouseId(),
            e.getLocationId(),
            e.getTotalQuantity(),
            e.getReservedQuantity(),
            e.getAvailableQuantity(),
            e.getSnapshotAt()
        );
    }
}

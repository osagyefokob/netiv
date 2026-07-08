package com.logistics.warehouseservice.application.dto.response;

import com.logistics.warehouseservice.infrastructure.persistence.entity.StorageLocationEntity;

import java.time.Instant;
import java.util.UUID;

public record LocationResponse(
    UUID locationId,
    UUID warehouseId,
    String zone,
    String aisle,
    String shelf,
    String bin,
    String locationCode,
    String locationType,
    int maxCapacity,
    int currentOccupancy,
    boolean isActive,
    Instant createdAt,
    Instant updatedAt
) {
    public static LocationResponse from(StorageLocationEntity e) {
        return new LocationResponse(
            e.getLocationId(),
            e.getWarehouseId(),
            e.getZone(),
            e.getAisle(),
            e.getShelf(),
            e.getBin(),
            e.getLocationCode(),
            e.getLocationType(),
            e.getMaxCapacity(),
            e.getCurrentOccupancy(),
            e.isActive(),
            e.getCreatedAt(),
            e.getUpdatedAt()
        );
    }
}

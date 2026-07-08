package com.logistics.warehouseservice.application.dto.response;

import com.logistics.warehouseservice.infrastructure.persistence.entity.WarehouseEntity;

import java.time.Instant;
import java.util.UUID;

public record WarehouseResponse(
    UUID warehouseId,
    UUID companyId,
    String name,
    String street,
    String city,
    String country,
    String type,
    int capacity,
    boolean isActive,
    long version,
    Instant createdAt,
    Instant updatedAt
) {
    public static WarehouseResponse from(WarehouseEntity e) {
        return new WarehouseResponse(
            e.getWarehouseId(),
            e.getCompanyId(),
            e.getName(),
            e.getStreet(),
            e.getCity(),
            e.getCountry(),
            e.getType(),
            e.getCapacity(),
            e.isActive(),
            e.getVersion(),
            e.getCreatedAt(),
            e.getUpdatedAt()
        );
    }
}

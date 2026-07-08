package com.logistics.warehouseservice.application.dto.response;

import com.logistics.warehouseservice.infrastructure.persistence.entity.StockMovementEntity;

import java.time.Instant;
import java.util.UUID;

public record StockMovementResponse(
    UUID movementId,
    UUID productId,
    UUID fromLocationId,
    UUID toLocationId,
    int quantity,
    String movementType,
    UUID performedBy,
    String notes,
    Instant createdAt
) {
    public static StockMovementResponse from(StockMovementEntity e) {
        return new StockMovementResponse(
            e.getMovementId(),
            e.getProductId(),
            e.getFromLocationId(),
            e.getToLocationId(),
            e.getQuantity(),
            e.getMovementType(),
            e.getPerformedBy(),
            e.getNotes(),
            e.getCreatedAt()
        );
    }
}

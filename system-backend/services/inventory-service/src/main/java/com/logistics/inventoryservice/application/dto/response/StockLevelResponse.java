package com.logistics.inventoryservice.application.dto.response;

import com.logistics.inventoryservice.infrastructure.persistence.entity.StockLevelEntity;
import java.util.UUID;

public record StockLevelResponse(
    UUID stockLevelId,
    UUID productId,
    UUID locationId,
    int quantityOnHand,
    int quantityReserved,
    int quantityAvailable
) {
    public static StockLevelResponse from(StockLevelEntity e) {
        return new StockLevelResponse(
            e.getStockLevelId(), e.getProductId(), e.getLocationId(),
            e.getQuantityOnHand(), e.getQuantityReserved(), e.calculateAvailable()
        );
    }
}

package com.logistics.inventoryservice.application.dto.response;

import com.logistics.inventoryservice.infrastructure.persistence.entity.ProductEntity;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ProductResponse(
    UUID productId,
    UUID companyId,
    String sku,
    String name,
    String description,
    String category,
    String unitOfMeasure,
    BigDecimal unitCost,
    int reorderThreshold,
    boolean active,
    Instant createdAt
) {
    public static ProductResponse from(ProductEntity e) {
        return new ProductResponse(
            e.getProductId(), e.getCompanyId(), e.getSku(), e.getName(), e.getDescription(),
            e.getCategory(), e.getUnitOfMeasure(), e.getUnitCost(),
            e.getReorderThreshold(), e.isActive(), e.getCreatedAt()
        );
    }
}

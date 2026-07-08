package com.logistics.procurementservice.application.dto.response;

import com.logistics.procurementservice.infrastructure.persistence.entity.PurchaseOrderItemEntity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PurchaseOrderItemResponse(
    UUID poItemId,
    UUID productId,
    int quantityOrdered,
    int quantityReceived,
    BigDecimal unitCost,
    BigDecimal lineTotal,
    Instant createdAt
) {
    public static PurchaseOrderItemResponse from(PurchaseOrderItemEntity e) {
        BigDecimal lineTotal = e.getLineTotal();
        if (lineTotal == null) {
            lineTotal = e.getUnitCost().multiply(BigDecimal.valueOf(e.getQuantityOrdered()));
        }
        return new PurchaseOrderItemResponse(
            e.getPoItemId(),
            e.getProductId(),
            e.getQuantityOrdered(),
            e.getQuantityReceived(),
            e.getUnitCost(),
            lineTotal,
            e.getCreatedAt()
        );
    }
}

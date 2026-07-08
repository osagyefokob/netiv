package com.logistics.reportingservice.api.dto;

import com.logistics.reportingservice.infrastructure.persistence.entity.MovementAggregateEntity;

import java.time.Instant;
import java.util.UUID;

public record MovementAggregateResponse(
    UUID aggId,
    UUID productId,
    UUID warehouseId,
    Instant periodStart,
    Instant periodEnd,
    int totalInbound,
    int totalOutbound,
    int netChange,
    Instant createdAt
) {
    public static MovementAggregateResponse from(MovementAggregateEntity e) {
        int net = e.getNetChange() != null ? e.getNetChange() : (e.getTotalInbound() - e.getTotalOutbound());
        return new MovementAggregateResponse(
            e.getAggId(),
            e.getProductId(),
            e.getWarehouseId(),
            e.getPeriodStart(),
            e.getPeriodEnd(),
            e.getTotalInbound(),
            e.getTotalOutbound(),
            net,
            e.getCreatedAt()
        );
    }
}

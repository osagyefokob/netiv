package com.logistics.reportingservice.api.dto;

import com.logistics.reportingservice.infrastructure.persistence.entity.OrderSummaryEntity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record OrderSummaryResponse(
    UUID summaryId,
    UUID orderId,
    UUID warehouseId,
    String status,
    String priority,
    BigDecimal totalAmount,
    int itemCount,
    Instant createdAt,
    Instant shippedAt,
    Instant deliveredAt
) {
    public static OrderSummaryResponse from(OrderSummaryEntity e) {
        return new OrderSummaryResponse(
            e.getSummaryId(),
            e.getOrderId(),
            e.getWarehouseId(),
            e.getStatus(),
            e.getPriority(),
            e.getTotalAmount(),
            e.getItemCount(),
            e.getCreatedAt(),
            e.getShippedAt(),
            e.getDeliveredAt()
        );
    }
}

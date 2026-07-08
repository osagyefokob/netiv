package com.logistics.ordermanagementservice.application.dto.response;

import com.logistics.ordermanagementservice.infrastructure.persistence.entity.OrderStatusHistoryEntity;

import java.time.Instant;
import java.util.UUID;

public record OrderStatusHistoryResponse(
    UUID id,
    UUID orderId,
    String fromStatus,
    String toStatus,
    UUID changedBy,
    String reason,
    Instant createdAt
) {
    public static OrderStatusHistoryResponse from(OrderStatusHistoryEntity e) {
        return new OrderStatusHistoryResponse(
            e.getHistoryId(),
            e.getOrderId(),
            e.getFromStatus(),
            e.getToStatus(),
            e.getChangedBy(),
            e.getReason(),
            e.getChangedAt()
        );
    }
}

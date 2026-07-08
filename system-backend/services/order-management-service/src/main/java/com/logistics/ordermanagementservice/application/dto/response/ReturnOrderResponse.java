package com.logistics.ordermanagementservice.application.dto.response;

import com.logistics.ordermanagementservice.infrastructure.persistence.entity.ReturnItemEntity;
import com.logistics.ordermanagementservice.infrastructure.persistence.entity.ReturnOrderEntity;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ReturnOrderResponse(
    UUID returnId,
    UUID originalOrderId,
    UUID warehouseId,
    UUID initiatedBy,
    String status,
    String reason,
    String notes,
    UUID restockLocationId,
    Instant createdAt,
    Instant updatedAt,
    List<ReturnItemResponse> items
) {
    public static ReturnOrderResponse from(ReturnOrderEntity e) {
        List<ReturnItemResponse> lines = e.getItems().stream().map(ReturnItemResponse::from).toList();
        return new ReturnOrderResponse(
            e.getReturnId(),
            e.getOriginalOrderId(),
            e.getWarehouseId(),
            e.getInitiatedBy(),
            e.getStatus(),
            e.getReason(),
            e.getNotes(),
            e.getRestockLocationId(),
            e.getCreatedAt(),
            e.getUpdatedAt(),
            lines
        );
    }

    public record ReturnItemResponse(
        UUID returnItemId,
        UUID productId,
        int quantity,
        String itemCondition,
        String disposition
    ) {
        public static ReturnItemResponse from(ReturnItemEntity i) {
            return new ReturnItemResponse(
                i.getReturnItemId(),
                i.getProductId(),
                i.getQuantity(),
                i.getItemCondition(),
                i.getDisposition()
            );
        }
    }
}

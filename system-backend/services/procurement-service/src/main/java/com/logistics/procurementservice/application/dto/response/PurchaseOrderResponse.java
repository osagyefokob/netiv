package com.logistics.procurementservice.application.dto.response;

import com.logistics.procurementservice.infrastructure.persistence.entity.PurchaseOrderEntity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PurchaseOrderResponse(
    UUID purchaseOrderId,
    UUID supplierId,
    UUID warehouseId,
    String status,
    BigDecimal totalAmount,
    UUID createdBy,
    LocalDate expectedDelivery,
    String notes,
    long version,
    Instant createdAt,
    Instant updatedAt,
    List<PurchaseOrderItemResponse> items
) {
    public static PurchaseOrderResponse from(PurchaseOrderEntity e) {
        List<PurchaseOrderItemResponse> itemDtos = e.getItems().stream()
            .map(PurchaseOrderItemResponse::from)
            .toList();
        return new PurchaseOrderResponse(
            e.getPurchaseOrderId(),
            e.getSupplierId(),
            e.getWarehouseId(),
            e.getStatus(),
            e.getTotalAmount(),
            e.getCreatedBy(),
            e.getExpectedDelivery(),
            e.getNotes(),
            e.getVersion(),
            e.getCreatedAt(),
            e.getUpdatedAt(),
            itemDtos
        );
    }
}

package com.logistics.warehouseservice.application.dto.response;

import com.logistics.warehouseservice.infrastructure.persistence.entity.InboundReceiptEntity;
import com.logistics.warehouseservice.infrastructure.persistence.entity.ReceiptLineEntity;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ReceiptResponse(
    UUID receiptId,
    UUID purchaseOrderId,
    UUID warehouseId,
    UUID receivedBy,
    String status,
    Instant receivedAt,
    String notes,
    long version,
    Instant createdAt,
    Instant updatedAt,
    List<ReceiptLineItemResponse> lines
) {
    public static ReceiptResponse from(InboundReceiptEntity e) {
        List<ReceiptLineItemResponse> lineDtos = e.getLines() == null
            ? List.of()
            : e.getLines().stream().map(ReceiptLineItemResponse::from).toList();
        return new ReceiptResponse(
            e.getReceiptId(),
            e.getPurchaseOrderId(),
            e.getWarehouseId(),
            e.getReceivedBy(),
            e.getStatus(),
            e.getReceivedAt(),
            e.getNotes(),
            e.getVersion(),
            e.getCreatedAt(),
            e.getUpdatedAt(),
            lineDtos
        );
    }

    public record ReceiptLineItemResponse(
        UUID receiptLineId,
        UUID productId,
        UUID batchId,
        UUID locationId,
        int qtyExpected,
        int qtyReceived,
        Instant createdAt
    ) {
        public static ReceiptLineItemResponse from(ReceiptLineEntity line) {
            return new ReceiptLineItemResponse(
                line.getReceiptLineId(),
                line.getProductId(),
                line.getBatchId(),
                line.getLocationId(),
                line.getQtyExpected(),
                line.getQtyReceived(),
                line.getCreatedAt()
            );
        }
    }
}

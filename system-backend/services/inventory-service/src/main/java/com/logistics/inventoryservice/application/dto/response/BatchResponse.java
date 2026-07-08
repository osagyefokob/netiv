package com.logistics.inventoryservice.application.dto.response;

import com.logistics.inventoryservice.infrastructure.persistence.entity.BatchEntity;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record BatchResponse(
    UUID batchId,
    UUID productId,
    String batchNumber,
    int quantity,
    String status,
    LocalDate manufactureDate,
    LocalDate expiryDate,
    Instant createdAt
) {
    public static BatchResponse from(BatchEntity e) {
        return new BatchResponse(
            e.getBatchId(),
            e.getProductId(),
            e.getBatchNumber(),
            e.getQuantity(),
            e.getStatus(),
            e.getManufactureDate(),
            e.getExpiryDate(),
            e.getCreatedAt()
        );
    }
}

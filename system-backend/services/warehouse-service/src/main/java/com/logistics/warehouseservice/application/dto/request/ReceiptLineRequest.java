package com.logistics.warehouseservice.application.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ReceiptLineRequest(
    @NotNull UUID productId,
    UUID locationId,
    int qtyExpected,
    int qtyReceived
) {
}

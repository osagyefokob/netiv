package com.logistics.ordermanagementservice.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateOrderRequest(
    String customerId,
    String warehouseId,
    String priority,
    LocalDate expectedDelivery,
    String notes,
    @NotEmpty @Valid List<OrderItemRequest> items
) {

    public record OrderItemRequest(
        String productId,
        int quantity,
        BigDecimal unitPrice
    ) {
        public UUID parsedProductId() {
            if (productId == null || productId.isBlank()) return null;
            try {
                return UUID.fromString(productId);
            } catch (IllegalArgumentException e) {
                try {
                    int num = Integer.parseInt(productId.trim());
                    return UUID.fromString("00000000-0000-0000-0000-" + String.format("%012d", num));
                } catch (NumberFormatException nfe) {
                    return UUID.nameUUIDFromBytes(("product:" + productId).getBytes());
                }
            }
        }
    }

    public UUID parsedCustomerId() {
        if (customerId == null || customerId.isBlank()) return null;
        try {
            return UUID.fromString(customerId);
        } catch (IllegalArgumentException e) {
            try {
                int num = Integer.parseInt(customerId.trim());
                return UUID.fromString("00000000-0000-0000-0000-" + String.format("%012d", num));
            } catch (NumberFormatException nfe) {
                return UUID.nameUUIDFromBytes(("customer:" + customerId).getBytes());
            }
        }
    }

    public UUID parsedWarehouseId() {
        if (warehouseId == null || warehouseId.isBlank()) return null;
        try {
            return UUID.fromString(warehouseId);
        } catch (IllegalArgumentException e) {
            try {
                int num = Integer.parseInt(warehouseId.trim());
                return UUID.fromString("00000000-0000-0000-0000-" + String.format("%012d", num));
            } catch (NumberFormatException nfe) {
                return UUID.nameUUIDFromBytes(("warehouse:" + warehouseId).getBytes());
            }
        }
    }
}
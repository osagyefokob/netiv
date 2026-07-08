package com.logistics.procurementservice.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreatePurchaseOrderRequest(
    @NotNull UUID supplierId,
    @NotNull UUID warehouseId,
    @NotNull UUID createdBy,
    LocalDate expectedDelivery,
    String notes,
    @NotEmpty @Valid List<PurchaseOrderItemRequest> items
) {
    public record PurchaseOrderItemRequest(
        @NotNull UUID productId,
        @Min(1) int quantityOrdered,
        @NotNull @DecimalMin("0.00") BigDecimal unitCost
    ) {}
}

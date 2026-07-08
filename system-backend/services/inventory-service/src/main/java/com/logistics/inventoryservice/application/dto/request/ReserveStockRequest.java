package com.logistics.inventoryservice.application.dto.request;

import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;

public record ReserveStockRequest(
    @NotNull UUID orderId,
    @NotEmpty List<ReservationItem> items
) {
    public record ReservationItem(
        @NotNull UUID productId,
        @NotNull UUID locationId,
        @Min(1) int quantity
    ) {}
}

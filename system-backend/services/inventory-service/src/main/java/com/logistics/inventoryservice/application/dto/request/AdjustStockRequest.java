package com.logistics.inventoryservice.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AdjustStockRequest(
    @NotNull UUID productId,
    @NotNull UUID locationId,
    int quantityDelta,
    @NotBlank String reason
) {}

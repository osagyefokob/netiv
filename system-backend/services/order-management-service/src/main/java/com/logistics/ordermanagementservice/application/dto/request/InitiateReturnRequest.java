package com.logistics.ordermanagementservice.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record InitiateReturnRequest(
    @NotNull UUID initiatedBy,
    @NotBlank String reason,
    String notes,
    UUID restockLocationId,
    @NotEmpty @Valid List<ReturnLine> lines
) {
    public record ReturnLine(
        @NotNull UUID productId,
        @Min(1) int quantity
    ) {}
}

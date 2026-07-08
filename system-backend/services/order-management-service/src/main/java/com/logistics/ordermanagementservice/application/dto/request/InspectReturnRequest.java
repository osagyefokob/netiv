package com.logistics.ordermanagementservice.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record InspectReturnRequest(
    @NotEmpty @Valid List<ItemCondition> items
) {
    public record ItemCondition(
        @NotNull UUID returnItemId,
        @NotNull String itemCondition
    ) {}
}

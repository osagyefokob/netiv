package com.logistics.ordermanagementservice.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record ProcessReturnRequest(
    @NotEmpty @Valid List<ItemDisposition> items
) {
    public record ItemDisposition(
        @NotNull UUID returnItemId,
        @NotNull String disposition
    ) {}
}

package com.logistics.ordermanagementservice.application.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CancelOrderRequest(
    String reason,
    @NotNull UUID cancelledBy
) {}

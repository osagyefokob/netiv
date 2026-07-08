package com.logistics.useridentityservice.application.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record UpdateUserRoleRequest(
    @NotNull UUID roleId,
    UUID warehouseId
) {}

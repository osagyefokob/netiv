package com.logistics.useridentityservice.infrastructure.security;

import java.util.List;
import java.util.UUID;

public record TokenClaims(
    UUID userId,
    String email,
    UUID roleId,
    String roleName,
    List<String> permissions,
    UUID warehouseId,
    UUID companyId
) {}

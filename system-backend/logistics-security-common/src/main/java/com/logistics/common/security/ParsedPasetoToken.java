package com.logistics.common.security;

import java.util.List;
import java.util.UUID;

public record ParsedPasetoToken(
    String tokenId,
    UUID userId,
    String email,
    UUID roleId,
    String roleName,
    UUID companyId,
    UUID warehouseId,
    List<String> permissions
) {}
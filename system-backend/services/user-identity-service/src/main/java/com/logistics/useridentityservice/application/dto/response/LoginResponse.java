package com.logistics.useridentityservice.application.dto.response;

import java.util.UUID;

public record LoginResponse(
    String accessToken,
    String refreshToken,
    long expiresIn,
    UserInfo user
) {
    public record UserInfo(
        UUID userId,
        String email,
        String role,
        UUID warehouseId,
        UUID companyId
    ) {}
}

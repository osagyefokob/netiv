package com.logistics.useridentityservice.application.dto.response;

import com.logistics.useridentityservice.infrastructure.persistence.entity.UserEntity;
import java.time.Instant;
import java.util.UUID;

public record UserResponse(
    UUID userId,
    String email,
    String firstName,
    String lastName,
    String role,
    UUID warehouseId,
    UUID companyId,
    String companyName,
    boolean active,
    Instant createdAt
) {
    public static UserResponse from(UserEntity entity) {
        return new UserResponse(
            entity.getUserId(),
            entity.getEmail(),
            entity.getFirstName(),
            entity.getLastName(),
            entity.getRole().getName(),
            entity.getWarehouseId(),
            entity.getCompany() != null ? entity.getCompany().getCompanyId() : null,
            entity.getCompany() != null ? entity.getCompany().getName() : null,
            entity.isActive(),
            entity.getCreatedAt()
        );
    }
}

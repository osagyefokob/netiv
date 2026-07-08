package com.logistics.useridentityservice.application.dto.request;

import jakarta.validation.constraints.*;
import java.util.UUID;

public record CreateUserRequest(
    @Email @NotBlank String email,
    @NotBlank String firstName,
    @NotBlank String lastName,
    @NotNull UUID roleId,
    UUID warehouseId,
    /** Required when caller is SUPER_ADMIN (except for SUPER_ADMIN role assignments). Ignored for COMPANY_ADMIN (uses caller company). */
    UUID companyId,
    @NotBlank @Size(min = 8) String temporaryPassword
) {}

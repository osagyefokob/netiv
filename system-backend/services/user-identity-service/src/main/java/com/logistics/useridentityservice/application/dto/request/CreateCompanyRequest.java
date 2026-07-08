package com.logistics.useridentityservice.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCompanyRequest(
    @NotBlank @Size(max = 255) String name,
    @Size(max = 64) String code
) {}

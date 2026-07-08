package com.logistics.useridentityservice.application.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateProfileRequest(
    @NotBlank String firstName,
    @NotBlank String lastName
) {}
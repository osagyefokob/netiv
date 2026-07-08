package com.logistics.warehouseservice.application.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record CreateLocationRequest(
    @NotBlank String zone,
    @NotBlank String aisle,
    @NotBlank String shelf,
    @NotBlank String bin,
    @NotBlank String locationType,
    @Min(1) int maxCapacity,
    String locationId
) {
}

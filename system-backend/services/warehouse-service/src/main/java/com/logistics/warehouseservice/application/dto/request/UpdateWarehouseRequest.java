package com.logistics.warehouseservice.application.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record UpdateWarehouseRequest(
    @NotBlank String name,
    @NotBlank String street,
    @NotBlank String city,
    @NotBlank String country,
    @NotBlank String type,
    @Min(1) int capacity
) {
}

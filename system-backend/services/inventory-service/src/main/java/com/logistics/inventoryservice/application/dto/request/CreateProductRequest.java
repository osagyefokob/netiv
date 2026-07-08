package com.logistics.inventoryservice.application.dto.request;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record CreateProductRequest(
    @NotBlank String sku,
    @NotBlank String name,
    String description,
    @NotBlank String category,
    @NotBlank String unitOfMeasure,
    @NotNull @DecimalMin("0.00") BigDecimal unitCost,
    @Min(0) int reorderThreshold
) {}

package com.logistics.inventoryservice.application.dto.request;

import java.math.BigDecimal;

public record UpdateProductRequest(
    String name,
    String description,
    BigDecimal unitCost,
    Integer reorderThreshold
) {}

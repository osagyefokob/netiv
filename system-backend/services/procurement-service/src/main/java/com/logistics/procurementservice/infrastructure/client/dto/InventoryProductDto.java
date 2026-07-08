package com.logistics.procurementservice.infrastructure.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record InventoryProductDto(
    UUID productId,
    String sku,
    String name,
    String category,
    int reorderThreshold
) {}

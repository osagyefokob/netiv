package com.logistics.procurementservice.infrastructure.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record WarehouseLocationDto(
    UUID locationId,
    UUID warehouseId,
    String locationCode
) {}

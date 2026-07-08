package com.logistics.procurementservice.infrastructure.client.dto;

import java.util.UUID;

public record InventoryStockLevelDto(
    UUID stockLevelId,
    UUID productId,
    UUID locationId,
    int quantityOnHand,
    int quantityReserved,
    int quantityAvailable
) {}

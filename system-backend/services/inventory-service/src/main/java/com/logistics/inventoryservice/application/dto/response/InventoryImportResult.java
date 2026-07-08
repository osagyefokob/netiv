package com.logistics.inventoryservice.application.dto.response;

import java.util.List;

public record InventoryImportResult(
    int rowsProcessed,
    int productsUpserted,
    int stockLevelsUpdated,
    List<String> errors
) {}

package com.logistics.useridentityservice.domain.model;

import lombok.Value;
import java.util.UUID;

@Value
public class WarehouseScope {
    UUID warehouseId;

    public static WarehouseScope of(UUID warehouseId) {
        return new WarehouseScope(warehouseId);
    }

    public boolean isScoped() {
        return warehouseId != null;
    }
}

package com.logistics.inventoryservice.infrastructure.security;

import com.logistics.common.security.LogisticsTenantContext;

import java.util.UUID;

public final class InventoryTenant {

    private InventoryTenant() {}

    public static UUID currentCompanyId() {
        return LogisticsTenantContext.getCompanyId();
    }
}

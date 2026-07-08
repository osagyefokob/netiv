package com.logistics.common.security;

import java.util.UUID;

/**
 * Effective company scope for the current request (after resolving super-admin header / token).
 */
public final class LogisticsTenantContext {

    private static final ThreadLocal<UUID> COMPANY_ID = new ThreadLocal<>();

    public static void setCompanyId(UUID companyId) {
        COMPANY_ID.set(companyId);
    }

    public static UUID getCompanyId() {
        return COMPANY_ID.get();
    }

    public static void clear() {
        COMPANY_ID.remove();
    }

    private LogisticsTenantContext() {}
}
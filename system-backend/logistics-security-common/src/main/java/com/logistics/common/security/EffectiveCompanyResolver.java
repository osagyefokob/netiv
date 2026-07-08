package com.logistics.common.security;

import jakarta.servlet.http.HttpServletRequest;

import java.util.UUID;

/**
 * Resolves tenant company for downstream services. Super-admins may pass {@code X-Company-Id};
 * others use the token's company or fall back to the demo tenant when missing.
 */
public final class EffectiveCompanyResolver {

    private EffectiveCompanyResolver() {}

    public static UUID resolve(LogisticsSecurityUser user, HttpServletRequest request) {
        if (user == null) {
            return DemoCompany.ID;
        }
        if ("SUPER_ADMIN".equals(user.getRoleName())) {
            String header = request.getHeader("X-Company-Id");
            if (header != null && !header.isBlank()) {
                return UUID.fromString(header.trim());
            }
            return DemoCompany.ID;
        }
        UUID fromToken = user.getCompanyId();
        return fromToken != null ? fromToken : DemoCompany.ID;
    }
}

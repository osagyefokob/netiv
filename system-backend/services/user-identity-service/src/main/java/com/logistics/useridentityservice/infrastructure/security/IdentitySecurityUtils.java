package com.logistics.useridentityservice.infrastructure.security;

import com.logistics.common.security.LogisticsSecurityUser;
import com.logistics.useridentityservice.api.exception.BusinessException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class IdentitySecurityUtils {

    private IdentitySecurityUtils() {}

    public static LogisticsSecurityUser requireUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof LogisticsSecurityUser user)) {
            throw new BusinessException("UNAUTHORIZED", "Authentication required");
        }
        return user;
    }
}

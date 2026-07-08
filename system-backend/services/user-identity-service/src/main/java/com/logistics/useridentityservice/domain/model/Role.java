package com.logistics.useridentityservice.domain.model;

import java.util.Set;
import java.util.UUID;

public interface Role {
    UUID getRoleId();
    RoleName getName();
    Set<? extends RolePermission> getPermissions();

    interface RolePermission {
        String getResource();
        String getAction();
    }
}

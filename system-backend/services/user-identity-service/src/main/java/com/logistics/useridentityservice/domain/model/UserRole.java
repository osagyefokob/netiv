package com.logistics.useridentityservice.domain.model;

import lombok.Value;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Value
public class UserRole {
    UUID roleId;
    RoleName roleName;
    Set<Permission> permissions;

    public static UserRole from(Role role) {
        return new UserRole(
            role.getRoleId(),
            role.getName(),
            role.getPermissions().stream()
                .map(p -> new Permission(p.getResource(), p.getAction()))
                .collect(Collectors.toSet())
        );
    }

    public boolean hasPermission(String resource, String action) {
        return permissions.stream()
            .anyMatch(p -> p.resource().equals(resource) && p.action().equals(action));
    }

    public record Permission(String resource, String action) {}
}

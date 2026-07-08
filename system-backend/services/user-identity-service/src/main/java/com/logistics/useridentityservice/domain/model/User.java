package com.logistics.useridentityservice.domain.model;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Getter
@NoArgsConstructor
public class User {

    private UUID userId;
    private Email email;
    private PasswordHash passwordHash;
    private String firstName;
    private String lastName;
    private UserRole role;
    private WarehouseScope warehouseScope;
    private boolean active;
    private Instant lastLogin;
    private long version;
    private Instant createdAt;
    private Instant updatedAt;

    public static User create(String email, String rawPassword,
                              String firstName, String lastName,
                              Role role, UUID warehouseId) {
        if (role.getName() == RoleName.WAREHOUSE_STAFF && warehouseId == null) {
            throw new IllegalArgumentException("WAREHOUSE_STAFF must have a warehouseId assigned");
        }

        User user = new User();
        user.userId = UUID.randomUUID();
        user.email = Email.of(email);
        user.passwordHash = PasswordHash.encode(rawPassword);
        user.firstName = firstName;
        user.lastName = lastName;
        user.role = UserRole.from(role);
        user.warehouseScope = WarehouseScope.of(warehouseId);
        user.active = true;
        user.version = 0;
        user.createdAt = Instant.now();
        user.updatedAt = Instant.now();
        return user;
    }

    public void deactivate() {
        this.active = false;
        this.updatedAt = Instant.now();
    }

    public void changeRole(Role newRole, UUID newWarehouseId) {
        if (newRole.getName() == RoleName.WAREHOUSE_STAFF && newWarehouseId == null) {
            throw new IllegalArgumentException("WAREHOUSE_STAFF must have a warehouseId assigned");
        }
        this.role = UserRole.from(newRole);
        this.warehouseScope = WarehouseScope.of(newWarehouseId);
        this.updatedAt = Instant.now();
    }

    public void recordLogin() {
        this.lastLogin = Instant.now();
        this.updatedAt = Instant.now();
    }

    public boolean hasPermission(String resource, String action) {
        return role.hasPermission(resource, action);
    }

    public boolean isWarehouseScoped() {
        return warehouseScope.isScoped();
    }
}

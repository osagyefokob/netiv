package com.logistics.common.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public class LogisticsSecurityUser implements UserDetails {

    private final UUID userId;
    private final UUID companyId;
    private final UUID warehouseId;
    private final String email;
    private final String roleName;
    private final Collection<? extends GrantedAuthority> authorities;

    public LogisticsSecurityUser(ParsedPasetoToken token) {
        this.userId = token.userId();
        this.companyId = token.companyId();
        this.warehouseId = token.warehouseId();
        this.email = token.email();
        this.roleName = token.roleName();
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + token.roleName()));
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getCompanyId() {
        return companyId;
    }

    public UUID getWarehouseId() {
        return warehouseId;
    }

    public String getRoleName() {
        return roleName;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return "";
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
package com.logistics.useridentityservice.application.dto.response;

import com.logistics.useridentityservice.infrastructure.persistence.entity.CompanyEntity;

import java.util.UUID;

public record CompanyResponse(
    UUID companyId,
    String name,
    String code,
    boolean active
) {
    public static CompanyResponse from(CompanyEntity e) {
        return new CompanyResponse(e.getCompanyId(), e.getName(), e.getCode(), e.isActive());
    }
}

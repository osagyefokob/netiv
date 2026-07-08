package com.logistics.procurementservice.application.dto.response;

import com.logistics.procurementservice.infrastructure.persistence.entity.SupplierEntity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SupplierResponse(
    UUID supplierId,
    String name,
    String contactEmail,
    String contactPhone,
    String street,
    String city,
    String country,
    int leadTimeDays,
    String paymentTerms,
    BigDecimal rating,
    boolean active,
    Instant createdAt,
    Instant updatedAt
) {
    public static SupplierResponse from(SupplierEntity e) {
        return new SupplierResponse(
            e.getSupplierId(),
            e.getName(),
            e.getContactEmail(),
            e.getContactPhone(),
            e.getStreet(),
            e.getCity(),
            e.getCountry(),
            e.getLeadTimeDays(),
            e.getPaymentTerms(),
            e.getRating(),
            e.isActive(),
            e.getCreatedAt(),
            e.getUpdatedAt()
        );
    }
}

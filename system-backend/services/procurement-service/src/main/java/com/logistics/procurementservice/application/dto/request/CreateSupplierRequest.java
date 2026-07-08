package com.logistics.procurementservice.application.dto.request;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record CreateSupplierRequest(
    @NotBlank @Size(max = 255) String name,
    @NotBlank @Email @Size(max = 255) String contactEmail,
    @Size(max = 50) String contactPhone,
    @Size(max = 255) String street,
    @Size(max = 100) String city,
    @Size(max = 100) String country,
    @Positive Integer leadTimeDays,
    @Pattern(regexp = "NET_15|NET_30|NET_60|PREPAID|COD") String paymentTerms,
    @DecimalMin("0.00") @DecimalMax("5.00") BigDecimal rating
) {}

package com.logistics.warehouseservice.application.dto.request;

import jakarta.validation.constraints.NotBlank;

public record RejectReceiptRequest(
    @NotBlank String reason
) {
}

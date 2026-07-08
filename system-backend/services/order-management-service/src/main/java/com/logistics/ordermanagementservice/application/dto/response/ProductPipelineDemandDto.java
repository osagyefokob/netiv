package com.logistics.ordermanagementservice.application.dto.response;

import java.util.UUID;

public record ProductPipelineDemandDto(UUID productId, long openQuantity) {}

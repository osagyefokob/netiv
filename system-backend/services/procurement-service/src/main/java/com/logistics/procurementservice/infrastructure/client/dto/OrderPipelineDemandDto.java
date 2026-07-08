package com.logistics.procurementservice.infrastructure.client.dto;

import java.util.UUID;

public record OrderPipelineDemandDto(UUID productId, long openQuantity) {}

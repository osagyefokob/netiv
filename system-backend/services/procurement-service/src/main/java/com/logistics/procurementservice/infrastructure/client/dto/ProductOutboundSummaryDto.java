package com.logistics.procurementservice.infrastructure.client.dto;

import java.util.UUID;

public record ProductOutboundSummaryDto(UUID productId, long totalOutbound) {}

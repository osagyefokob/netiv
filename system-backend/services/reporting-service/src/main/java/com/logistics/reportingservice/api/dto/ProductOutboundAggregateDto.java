package com.logistics.reportingservice.api.dto;

import java.util.UUID;

public record ProductOutboundAggregateDto(UUID productId, long totalOutbound) {}

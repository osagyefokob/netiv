package com.logistics.reportingservice.api.dto;

public record MovementTrendDto(
    String date,
    int inbound,
    int outbound,
    int internal
) {
}

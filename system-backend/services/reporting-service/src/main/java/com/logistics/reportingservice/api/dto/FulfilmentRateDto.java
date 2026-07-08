package com.logistics.reportingservice.api.dto;

public record FulfilmentRateDto(
    double rate,
    int fulfilled,
    int total,
    String period
) {
}

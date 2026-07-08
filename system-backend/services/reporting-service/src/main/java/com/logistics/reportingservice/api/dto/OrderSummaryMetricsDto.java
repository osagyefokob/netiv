package com.logistics.reportingservice.api.dto;

import java.util.Map;

public record OrderSummaryMetricsDto(
    int totalOrders,
    Map<String, Integer> byStatus,
    double totalRevenue,
    double averageOrderValue,
    String period
) {
}

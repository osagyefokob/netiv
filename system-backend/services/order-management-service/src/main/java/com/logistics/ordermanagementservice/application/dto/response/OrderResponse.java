package com.logistics.ordermanagementservice.application.dto.response;

import com.logistics.ordermanagementservice.infrastructure.persistence.entity.OrderEntity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record OrderResponse(
    UUID orderId,
    UUID customerId,
    UUID warehouseId,
    UUID companyId,
    String status,
    String priority,
    BigDecimal totalAmount,
    LocalDate expectedDelivery,
    List<OrderItemResponse> items,
    Instant createdAt
) {

    public static OrderResponse from(OrderEntity e) {
        List<OrderItemResponse> itemResponses = e.getItems() == null
            ? List.of()
            : e.getItems().stream().map(OrderItemResponse::from).toList();
        return new OrderResponse(
            e.getOrderId(),
            e.getCustomerId(),
            e.getWarehouseId(),
            e.getCompanyId(),
            e.getStatus(),
            e.getPriority(),
            e.getTotalAmount(),
            e.getExpectedDelivery(),
            itemResponses,
            e.getCreatedAt()
        );
    }
}

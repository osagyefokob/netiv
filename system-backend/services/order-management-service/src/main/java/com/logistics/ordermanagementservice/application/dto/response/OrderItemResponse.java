package com.logistics.ordermanagementservice.application.dto.response;

import com.logistics.ordermanagementservice.infrastructure.persistence.entity.OrderItemEntity;

import java.math.BigDecimal;
import java.util.UUID;

public record OrderItemResponse(
    UUID orderItemId,
    UUID productId,
    int quantity,
    BigDecimal unitPrice,
    BigDecimal lineTotal,
    String status,
    UUID reservationId
) {

    public static OrderItemResponse from(OrderItemEntity e) {
        return new OrderItemResponse(
            e.getOrderItemId(),
            e.getProductId(),
            e.getQuantity(),
            e.getUnitPrice(),
            e.getLineTotal(),
            e.getStatus(),
            e.getReservationId()
        );
    }
}

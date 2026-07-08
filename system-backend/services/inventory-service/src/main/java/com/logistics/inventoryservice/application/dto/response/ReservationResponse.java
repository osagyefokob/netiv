package com.logistics.inventoryservice.application.dto.response;

import com.logistics.inventoryservice.infrastructure.persistence.entity.StockReservationEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ReservationResponse(
    UUID reservationId,
    UUID orderId,
    String status,
    Instant expiresAt,
    List<ReservationItemResponse> items
) {
    public record ReservationItemResponse(
        UUID productId,
        UUID locationId,
        int quantity
    ) {}

    public static ReservationResponse from(StockReservationEntity e) {
        List<ReservationItemResponse> itemResponses = e.getItems().stream()
            .map(i -> new ReservationItemResponse(i.getProductId(), i.getLocationId(), i.getQuantity()))
            .toList();
        return new ReservationResponse(
            e.getReservationId(), e.getOrderId(), e.getStatus(), e.getExpiresAt(), itemResponses
        );
    }
}

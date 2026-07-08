package com.logistics.ordermanagementservice.infrastructure.messaging.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.logistics.ordermanagementservice.application.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class InventoryEventConsumer {

    private final OrderService orderService;
    private final ObjectMapper objectMapper;

    @KafkaListener(
        topics = "inventory.stock.reserved",
        groupId = "order-management-service",
        containerFactory = "orderInventoryKafkaListenerContainerFactory"
    )
    public void onStockReserved(String payload) {
        log.info("Received inventory.stock.reserved: {}", payload);
        try {
            JsonNode root = unwrapPayload(payload);
            JsonNode data = root.has("payload") ? root.get("payload") : root;
            if (!data.hasNonNull("orderId")) {
                log.warn("inventory.stock.reserved payload missing orderId");
                return;
            }
            UUID orderId = UUID.fromString(data.get("orderId").asText());
            UUID correlationId = data.hasNonNull("correlationId")
                ? UUID.fromString(data.get("correlationId").asText())
                : null;
            orderService.advanceToProcessingFromInventory(orderId, correlationId);
        } catch (Exception e) {
            log.error("Failed to handle inventory.stock.reserved", e);
        }
    }

    @KafkaListener(
        topics = "inventory.stock.reservation_failed",
        groupId = "order-management-service",
        containerFactory = "orderInventoryKafkaListenerContainerFactory"
    )
    public void onStockReservationFailed(String payload) {
        log.info("Received inventory.stock.reservation_failed: {}", payload);
        try {
            JsonNode root = unwrapPayload(payload);
            JsonNode data = root.has("payload") ? root.get("payload") : root;
            if (!data.hasNonNull("orderId")) {
                log.warn("inventory.stock.reservation_failed payload missing orderId");
                return;
            }
            UUID orderId = UUID.fromString(data.get("orderId").asText());
            UUID correlationId = data.hasNonNull("correlationId")
                ? UUID.fromString(data.get("correlationId").asText())
                : null;
            String reason = data.hasNonNull("reason") ? data.get("reason").asText() : "Stock reservation failed";
            orderService.markFailedAfterReservation(orderId, correlationId, reason);
        } catch (Exception e) {
            log.error("Failed to handle inventory.stock.reservation_failed", e);
        }
    }

    private JsonNode unwrapPayload(String raw) throws Exception {
        JsonNode node = objectMapper.readTree(raw);
        if (node.isTextual()) {
            node = objectMapper.readTree(node.asText());
        }
        return node;
    }
}

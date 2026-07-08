package com.logistics.inventoryservice.infrastructure.messaging;

import com.logistics.inventoryservice.infrastructure.persistence.entity.OutboxEventEntity;
import com.logistics.inventoryservice.infrastructure.persistence.repository.OutboxEventJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxEventPublisher {

    private final OutboxEventJpaRepository outboxRepository;

    private static final Map<String, String> TOPIC_MAP = Map.of(
        "inventory.stock.reserved",            "inventory.stock.reserved",
        "inventory.stock.reservation_failed",  "inventory.stock.reservation_failed",
        "inventory.stock.released",            "inventory.stock.released",
        "inventory.stock.adjusted",            "inventory.stock.adjusted",
        "inventory.stock.low_stock_alert",     "inventory.stock.low_stock_alert",
        "inventory.product.created",           "inventory.product.created",
        "inventory.product.updated",           "inventory.product.updated",
        "inventory.product.deleted",           "inventory.product.deleted"
    );

    public void publish(String eventType, UUID correlationId, String payload) {
        OutboxEventEntity event = new OutboxEventEntity();
        event.setCorrelationId(correlationId);
        event.setEventType(eventType);
        event.setTopic(TOPIC_MAP.getOrDefault(eventType, eventType));
        event.setPayload(payload);
        event.setStatus("PENDING");
        outboxRepository.save(event);
        log.debug("Outbox event queued: type={}, correlationId={}", eventType, correlationId);
    }
}

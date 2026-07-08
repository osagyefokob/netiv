package com.logistics.ordermanagementservice.infrastructure.messaging;

import com.logistics.ordermanagementservice.infrastructure.persistence.entity.OutboxEventEntity;
import com.logistics.ordermanagementservice.infrastructure.persistence.repository.OutboxEventJpaRepository;
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
        "order.created", "order.created",
        "order.status.changed", "order.status.changed",
        "order.cancelled", "order.cancelled",
        "order.return.processed", "order.return.processed"
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

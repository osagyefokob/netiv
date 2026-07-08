package com.logistics.procurementservice.infrastructure.messaging;

import com.logistics.procurementservice.infrastructure.persistence.entity.OutboxEventEntity;
import com.logistics.procurementservice.infrastructure.persistence.repository.OutboxEventJpaRepository;
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
        "procurement.purchase_order.submitted", "procurement.purchase_order.submitted",
        "procurement.purchase_order.cancelled", "procurement.purchase_order.cancelled"
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

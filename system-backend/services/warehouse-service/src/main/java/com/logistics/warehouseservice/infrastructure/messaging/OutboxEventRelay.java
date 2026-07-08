package com.logistics.warehouseservice.infrastructure.messaging;

import com.logistics.warehouseservice.infrastructure.persistence.entity.OutboxEventEntity;
import com.logistics.warehouseservice.infrastructure.persistence.repository.OutboxEventJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxEventRelay {

    private final OutboxEventJpaRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void relayPendingEvents() {
        List<OutboxEventEntity> pending = outboxRepository
            .findTop50ByStatusOrderByCreatedAtAsc("PENDING");

        for (OutboxEventEntity event : pending) {
            try {
                kafkaTemplate.send(event.getTopic(), event.getCorrelationId().toString(), event.getPayload())
                    .get();
                event.setStatus("PUBLISHED");
                event.setPublishedAt(Instant.now());
                log.debug("Event published: outboxId={}, topic={}", event.getOutboxId(), event.getTopic());
            } catch (Exception e) {
                event.setRetryCount(event.getRetryCount() + 1);
                if (event.getRetryCount() >= 5) {
                    event.setStatus("FAILED");
                    log.error("Event permanently failed: outboxId={}", event.getOutboxId(), e);
                } else {
                    log.warn("Event publish failed (attempt {}): outboxId={}", event.getRetryCount(), event.getOutboxId());
                }
            }
            outboxRepository.save(event);
        }
    }
}

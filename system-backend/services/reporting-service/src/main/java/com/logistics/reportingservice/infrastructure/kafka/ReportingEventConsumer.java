package com.logistics.reportingservice.infrastructure.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.logistics.reportingservice.infrastructure.persistence.repository.InventorySnapshotJpaRepository;
import com.logistics.reportingservice.infrastructure.persistence.repository.OrderSummaryJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReportingEventConsumer {

    private final InventorySnapshotJpaRepository snapshotRepo;
    private final OrderSummaryJpaRepository orderSummaryRepo;
    private final ObjectMapper objectMapper;

    @KafkaListener(
        topics = {
            "inventory.stock.adjusted",
            "inventory.stock.low_stock_alert",
            "warehouse.goods.received",
            "warehouse.goods.dispatched",
            "order.created",
            "order.status.changed"
        },
        groupId = "reporting-service"
    )
    public void handleEvent(String payload, @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
        try {
            log.info("Reporting event received [{}]: {}", topic, payload);
            // For now, just log the events. Full materialization will be implemented in a later stage.
        } catch (Exception e) {
            log.error("Failed to process reporting event from topic {}: {}", topic, e.getMessage(), e);
        }
    }
}

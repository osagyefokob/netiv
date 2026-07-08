package com.logistics.notificationservice.infrastructure.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.logistics.notificationservice.infrastructure.persistence.entity.NotificationLogEntity;
import com.logistics.notificationservice.infrastructure.persistence.entity.NotificationTemplateEntity;
import com.logistics.notificationservice.infrastructure.persistence.repository.NotificationLogJpaRepository;
import com.logistics.notificationservice.infrastructure.persistence.repository.NotificationTemplateJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventConsumer {

    private final NotificationTemplateJpaRepository templateRepository;
    private final NotificationLogJpaRepository logRepository;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = {
        "inventory.stock.low_stock_alert",
        "order.status.changed",
        "order.assigned",
        "order.delayed",
        "procurement.delivery.delayed",
        "warehouse.location.capacity_exceeded",
        "identity.user.deactivated"
    }, groupId = "notification-service")
    public void handleEvent(String payload, @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
        try {
            JsonNode json = objectMapper.readTree(payload);
            String eventType = json.has("eventType") ? json.get("eventType").asText() : topic;

            templateRepository.findByEventType(eventType).ifPresentOrElse(
                template -> {
                    String rendered = renderTemplate(template.getBodyTemplate(), json);

                    NotificationLogEntity logEntry = new NotificationLogEntity();
                    logEntry.setTemplateId(template.getTemplateId());
                    logEntry.setRecipientId(UUID.fromString("00000000-0000-0000-0000-000000000000"));
                    logEntry.setChannel(template.getChannel());
                    logEntry.setPayload(payload);
                    logEntry.setStatus("SENT");
                    logEntry.setSentAt(Instant.now());
                    logRepository.save(logEntry);

                    log.info("NOTIFICATION [{}]: {}", topic, rendered);
                },
                () -> log.warn("No template found for event type: {}", eventType)
            );
        } catch (Exception e) {
            log.error("Failed to process notification event from topic {}: {}", topic, e.getMessage(), e);
        }
    }

    private String renderTemplate(String template, JsonNode json) {
        String rendered = template;
        JsonNode payloadNode = json.has("payload") ? json.get("payload") : json;
        var fields = payloadNode.fields();
        while (fields.hasNext()) {
            var entry = fields.next();
            rendered = rendered.replace("{{" + entry.getKey() + "}}", entry.getValue().asText());
        }
        return rendered;
    }
}

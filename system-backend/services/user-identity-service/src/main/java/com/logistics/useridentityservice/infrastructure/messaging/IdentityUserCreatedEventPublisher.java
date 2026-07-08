package com.logistics.useridentityservice.infrastructure.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.logistics.useridentityservice.infrastructure.persistence.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Publishes {@code identity.user.created} for downstream consumers (notifications, reporting, etc.).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class IdentityUserCreatedEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.kafka.user-created-topic:identity.user.created}")
    private String topic;

    public void publish(UserEntity user) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("eventType", "identity.user.created");
            payload.put("userId", user.getUserId().toString());
            payload.put("email", user.getEmail());
            payload.put("firstName", user.getFirstName());
            payload.put("lastName", user.getLastName());
            payload.put("role", user.getRole().getName());
            if (user.getCompany() != null) {
                payload.put("companyId", user.getCompany().getCompanyId().toString());
                payload.put("companyName", user.getCompany().getName());
            }
            payload.put("country", user.getCountry());
            payload.put("occurredAt", Instant.now().toString());

            String json = objectMapper.writeValueAsString(payload);
            kafkaTemplate.send(topic, user.getUserId().toString(), json);
            log.debug("Published {} for userId={}", topic, user.getUserId());
        } catch (Exception e) {
            log.warn("Failed to publish identity.user.created for userId={}", user.getUserId(), e);
        }
    }
}

package com.logistics.ordermanagementservice.application.service;

import com.logistics.ordermanagementservice.infrastructure.persistence.repository.SagaInstanceJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Coordinates ORDER_FULFILLMENT saga persistence; order status transitions are applied in {@link OrderService}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OrderFulfillmentSagaOrchestrator {

    private final SagaInstanceJpaRepository sagaRepository;

    @Transactional
    public void onStockReservedStep(UUID correlationId) {
        if (correlationId == null) {
            return;
        }
        sagaRepository.findByCorrelationId(correlationId).ifPresent(saga -> {
            saga.setStatus("IN_PROGRESS");
            saga.setCurrentStep(Math.max(saga.getCurrentStep(), 2));
            sagaRepository.save(saga);
            log.debug("Saga advanced after stock reserved: correlationId={}", correlationId);
        });
    }

    @Transactional
    public void onStockReservationFailedStep(UUID correlationId, String reason) {
        if (correlationId == null) {
            return;
        }
        sagaRepository.findByCorrelationId(correlationId).ifPresent(saga -> {
            saga.setStatus("FAILED");
            saga.setFailureReason(reason);
            sagaRepository.save(saga);
            log.debug("Saga marked failed: correlationId={}", correlationId);
        });
    }
}

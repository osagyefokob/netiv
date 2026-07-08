package com.logistics.ordermanagementservice.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.logistics.ordermanagementservice.api.exception.BusinessException;
import com.logistics.ordermanagementservice.application.dto.request.CancelOrderRequest;
import com.logistics.ordermanagementservice.application.dto.request.CreateOrderRequest;
import com.logistics.ordermanagementservice.application.dto.response.OrderItemResponse;
import com.logistics.ordermanagementservice.application.dto.response.OrderResponse;
import com.logistics.ordermanagementservice.application.dto.response.OrderStatusHistoryResponse;
import com.logistics.ordermanagementservice.application.dto.response.ProductPipelineDemandDto;
import com.logistics.ordermanagementservice.infrastructure.lock.OrderDistributedLock;
import com.logistics.ordermanagementservice.infrastructure.messaging.OutboxEventPublisher;
import com.logistics.ordermanagementservice.infrastructure.persistence.entity.OrderEntity;
import com.logistics.ordermanagementservice.infrastructure.persistence.entity.OrderItemEntity;
import com.logistics.ordermanagementservice.infrastructure.persistence.entity.OrderStatusHistoryEntity;
import com.logistics.ordermanagementservice.infrastructure.persistence.entity.SagaInstanceEntity;
import com.logistics.ordermanagementservice.infrastructure.persistence.repository.OrderItemJpaRepository;
import com.logistics.ordermanagementservice.infrastructure.persistence.repository.OrderJpaRepository;
import com.logistics.ordermanagementservice.infrastructure.persistence.repository.OrderStatusHistoryJpaRepository;
import com.logistics.ordermanagementservice.infrastructure.persistence.repository.SagaInstanceJpaRepository;
import com.logistics.common.security.LogisticsTenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private static final UUID INVENTORY_PIPELINE_ACTOR = UUID.fromString("a0000000-0000-0000-0000-000000000001");

    private static final Map<String, Set<String>> ALLOWED_TRANSITIONS = Map.ofEntries(
        Map.entry("DRAFT", Set.of("PENDING")),
        Map.entry("PENDING", Set.of("PROCESSING", "CANCELLED", "FAILED")),
        Map.entry("PROCESSING", Set.of("SHIPPED", "CANCELLED", "FAILED")),
        Map.entry("SHIPPED", Set.of("DELIVERED"))
    );

    private final OrderJpaRepository orderRepository;
    private final OrderItemJpaRepository orderItemRepository;
    private final OrderStatusHistoryJpaRepository historyRepository;
    private final SagaInstanceJpaRepository sagaRepository;
    private final OutboxEventPublisher outboxEventPublisher;
    private final ObjectMapper objectMapper;
    private final OrderDistributedLock orderDistributedLock;
    private final OrderFulfillmentSagaOrchestrator sagaOrchestrator;

    private static UUID tenantCompanyId() {
        UUID cid = LogisticsTenantContext.getCompanyId();
        if (cid == null) {
            throw new BusinessException("VALIDATION_ERROR", "No company context available");
        }
        return cid;
    }

    private OrderEntity requireOrderForTenant(UUID orderId) {
        return orderRepository.findByOrderIdAndCompanyId(orderId, tenantCompanyId())
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Order not found"));
    }

    private void validateTransition(String from, String to) {
        Set<String> allowed = ALLOWED_TRANSITIONS.getOrDefault(from, Set.of());
        if (!allowed.contains(to)) {
            throw new BusinessException(
                "INVALID_STATE_TRANSITION",
                "Cannot transition order from " + from + " to " + to
            );
        }
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        String priority = request.priority() == null || request.priority().isBlank()
            ? "STANDARD"
            : request.priority();
        if (!Set.of("STANDARD", "HIGH", "URGENT").contains(priority)) {
            throw new BusinessException("VALIDATION_ERROR", "Invalid priority: " + priority);
        }

        if (request.items() == null || request.items().isEmpty()) {
            throw new BusinessException("VALIDATION_ERROR", "At least one order item is required");
        }

        UUID customerId = request.parsedCustomerId();
        UUID warehouseId = request.parsedWarehouseId();
        
        if (customerId == null) throw new BusinessException("VALIDATION_ERROR", "customerId is required");
        if (warehouseId == null) throw new BusinessException("VALIDATION_ERROR", "warehouseId is required");
        
        log.info("Creating order for customerId: {}, warehouseId: {}", customerId, warehouseId);
        
        OrderEntity order = new OrderEntity();
        order.setCustomerId(customerId);
        order.setWarehouseId(warehouseId);
        order.setCompanyId(tenantCompanyId());
        order.setStatus("DRAFT");
        order.setPriority(priority);
        order.setExpectedDelivery(request.expectedDelivery());
        order.setNotes(request.notes());

        BigDecimal total = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        for (CreateOrderRequest.OrderItemRequest line : request.items()) {
            UUID productId = line.parsedProductId();
            if (productId == null) {
                throw new BusinessException("VALIDATION_ERROR", "productId is required for each item");
            }
            OrderItemEntity item = new OrderItemEntity();
            item.setOrder(order);
            item.setProductId(productId);
            item.setQuantity(line.quantity());
            item.setUnitPrice(line.unitPrice().setScale(2, RoundingMode.HALF_UP));
            order.getItems().add(item);
            BigDecimal lineAmount = line.unitPrice()
                .multiply(BigDecimal.valueOf(line.quantity()))
                .setScale(2, RoundingMode.HALF_UP);
            total = total.add(lineAmount);
        }
        order.setTotalAmount(total);

        OrderEntity saved = orderRepository.save(order);
        return OrderResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrder(UUID orderId) {
        return OrderResponse.from(requireOrderForTenant(orderId));
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> listOrders(Pageable pageable, String status, UUID warehouseId) {
        UUID cid = tenantCompanyId();
        boolean hasStatus = status != null && !status.isBlank();
        if (warehouseId != null && hasStatus) {
            return orderRepository.findAllByCompanyIdAndWarehouseIdAndStatus(cid, warehouseId, status, pageable).map(OrderResponse::from);
        }
        if (warehouseId != null) {
            return orderRepository.findAllByCompanyIdAndWarehouseId(cid, warehouseId, pageable).map(OrderResponse::from);
        }
        if (hasStatus) {
            return orderRepository.findAllByCompanyIdAndStatus(cid, status, pageable).map(OrderResponse::from);
        }
        return orderRepository.findAllByCompanyId(cid, pageable).map(OrderResponse::from);
    }

    @Transactional(readOnly = true)
    public List<ProductPipelineDemandDto> pipelineDemandByProduct() {
        return orderItemRepository.sumOpenPipelineQuantityByProduct(tenantCompanyId()).stream()
            .map(r -> new ProductPipelineDemandDto((UUID) r[0], ((Number) r[1]).longValue()))
            .toList();
    }

    @Transactional
    public OrderResponse markDelivered(UUID orderId, UUID actorId) {
        OrderEntity order = requireOrderForTenant(orderId);
        String from = order.getStatus();
        if (!"SHIPPED".equals(from)) {
            throw new BusinessException("INVALID_STATE_TRANSITION", "Only SHIPPED orders can be marked delivered");
        }
        validateTransition(from, "DELIVERED");
        order.setStatus("DELIVERED");
        orderRepository.save(order);
        recordHistory(orderId, from, "DELIVERED", actorId, null);
        try {
            String payload = toJson(Map.of(
                "orderId", orderId.toString(),
                "status", "DELIVERED"
            ));
            outboxEventPublisher.publish("order.status.changed", orderId, payload);
        } catch (JsonProcessingException e) {
            throw new BusinessException("VALIDATION_ERROR", "Failed to serialize event payload");
        }
        return OrderResponse.from(requireOrderForTenant(orderId));
    }

    @Transactional(readOnly = true)
    public List<OrderItemResponse> listOrderItems(UUID orderId) {
        OrderEntity order = requireOrderForTenant(orderId);
        return order.getItems().stream().map(OrderItemResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<OrderStatusHistoryResponse> listOrderHistory(UUID orderId) {
        if (!orderRepository.existsByOrderIdAndCompanyId(orderId, tenantCompanyId())) {
            throw new BusinessException("NOT_FOUND", "Order not found");
        }
        return historyRepository.findAllByOrderIdOrderByChangedAtDesc(orderId).stream()
            .map(OrderStatusHistoryResponse::from)
            .toList();
    }

    @Transactional
    public OrderResponse submitOrder(UUID orderId, UUID submittedBy) {
        if (!orderDistributedLock.tryLock(orderId)) {
            throw new BusinessException("CONFLICT", "Order is locked for processing");
        }
        registerLockRelease(orderId);
        try {
            OrderEntity order = requireOrderForTenant(orderId);
            if (!"DRAFT".equals(order.getStatus())) {
                throw new BusinessException("INVALID_STATE_TRANSITION", "Only DRAFT orders can be submitted");
            }
            String from = order.getStatus();
            validateTransition(from, "PENDING");
            order.setStatus("PENDING");
            orderRepository.save(order);

            UUID correlationId = UUID.randomUUID();
            String createdPayload = toJson(Map.of(
                "orderId", orderId.toString(),
                "customerId", order.getCustomerId().toString(),
                "warehouseId", order.getWarehouseId().toString(),
                "correlationId", correlationId.toString()
            ));
            outboxEventPublisher.publish("order.created", correlationId, createdPayload);

            SagaInstanceEntity saga = new SagaInstanceEntity();
            saga.setCorrelationId(correlationId);
            saga.setSagaType("ORDER_FULFILLMENT");
            saga.setPayload(toJson(Map.of("orderId", orderId.toString(), "correlationId", correlationId.toString())));
            sagaRepository.save(saga);

            recordHistory(orderId, from, "PENDING", submittedBy, null);
            return OrderResponse.from(requireOrderForTenant(orderId));
        } catch (JsonProcessingException e) {
            throw new BusinessException("VALIDATION_ERROR", "Failed to serialize event payload");
        }
    }

    private void registerLockRelease(UUID orderId) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                orderDistributedLock.unlock(orderId);
            }
        });
    }

    @Transactional
    public OrderResponse cancelOrder(UUID orderId, CancelOrderRequest request) {
        OrderEntity order = requireOrderForTenant(orderId);
        String from = order.getStatus();
        if (!"PENDING".equals(from) && !"PROCESSING".equals(from)) {
            throw new BusinessException(
                "INVALID_STATE_TRANSITION",
                "Only PENDING or PROCESSING orders can be cancelled"
            );
        }
        validateTransition(from, "CANCELLED");
        order.setStatus("CANCELLED");
        orderRepository.save(order);
        recordHistory(orderId, from, "CANCELLED", request.cancelledBy(), request.reason());
        try {
            String payload = toJson(Map.of(
                "orderId", orderId.toString(),
                "reason", request.reason() != null ? request.reason() : "",
                "cancelledBy", request.cancelledBy().toString()
            ));
            outboxEventPublisher.publish("order.cancelled", orderId, payload);
        } catch (JsonProcessingException e) {
            throw new BusinessException("VALIDATION_ERROR", "Failed to serialize event payload");
        }
        return OrderResponse.from(requireOrderForTenant(orderId));
    }

    @Transactional
    public void advanceToProcessingFromInventory(UUID orderId, UUID correlationId) {
        OrderEntity order = orderRepository.findById(orderId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Order not found"));
        String from = order.getStatus();
        validateTransition(from, "PROCESSING");
        order.setStatus("PROCESSING");
        orderRepository.save(order);
        recordHistory(orderId, from, "PROCESSING", INVENTORY_PIPELINE_ACTOR, "Stock reserved");
        sagaOrchestrator.onStockReservedStep(correlationId);
        try {
            String payload = toJson(Map.of(
                "orderId", orderId.toString(),
                "status", "PROCESSING",
                "correlationId", correlationId != null ? correlationId.toString() : ""
            ));
            UUID corr = correlationId != null ? correlationId : orderId;
            outboxEventPublisher.publish("order.status.changed", corr, payload);
        } catch (JsonProcessingException e) {
            throw new BusinessException("VALIDATION_ERROR", "Failed to serialize event payload");
        }
    }

    @Transactional
    public void markFailedAfterReservation(UUID orderId, UUID correlationId, String reason) {
        OrderEntity order = orderRepository.findById(orderId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Order not found"));
        String from = order.getStatus();
        validateTransition(from, "FAILED");
        order.setStatus("FAILED");
        orderRepository.save(order);
        recordHistory(orderId, from, "FAILED", INVENTORY_PIPELINE_ACTOR, reason);
        sagaOrchestrator.onStockReservationFailedStep(correlationId, reason);
        try {
            String payload = toJson(Map.of(
                "orderId", orderId.toString(),
                "status", "FAILED",
                "reason", reason != null ? reason : ""
            ));
            UUID corr = correlationId != null ? correlationId : orderId;
            outboxEventPublisher.publish("order.status.changed", corr, payload);
        } catch (JsonProcessingException e) {
            throw new BusinessException("VALIDATION_ERROR", "Failed to serialize event payload");
        }
    }

    private void recordHistory(UUID orderId, String fromStatus, String toStatus, UUID changedBy, String reason) {
        OrderStatusHistoryEntity h = new OrderStatusHistoryEntity();
        h.setOrderId(orderId);
        h.setFromStatus(fromStatus);
        h.setToStatus(toStatus);
        h.setChangedBy(changedBy);
        h.setReason(reason);
        historyRepository.save(h);
    }

    private String toJson(Map<String, String> map) throws JsonProcessingException {
        return objectMapper.writeValueAsString(new LinkedHashMap<>(map));
    }
}

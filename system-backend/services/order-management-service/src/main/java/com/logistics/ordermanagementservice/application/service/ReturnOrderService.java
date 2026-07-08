package com.logistics.ordermanagementservice.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.logistics.ordermanagementservice.api.exception.BusinessException;
import com.logistics.ordermanagementservice.application.dto.request.InitiateReturnRequest;
import com.logistics.ordermanagementservice.application.dto.request.InspectReturnRequest;
import com.logistics.ordermanagementservice.application.dto.request.ProcessReturnRequest;
import com.logistics.ordermanagementservice.application.dto.response.ReturnOrderResponse;
import com.logistics.ordermanagementservice.infrastructure.client.InventoryRestClient;
import com.logistics.ordermanagementservice.infrastructure.messaging.OutboxEventPublisher;
import com.logistics.ordermanagementservice.infrastructure.persistence.entity.OrderEntity;
import com.logistics.ordermanagementservice.infrastructure.persistence.entity.OrderItemEntity;
import com.logistics.ordermanagementservice.infrastructure.persistence.entity.ReturnItemEntity;
import com.logistics.ordermanagementservice.infrastructure.persistence.entity.ReturnOrderEntity;
import com.logistics.ordermanagementservice.infrastructure.persistence.repository.OrderJpaRepository;
import com.logistics.ordermanagementservice.infrastructure.persistence.repository.ReturnOrderJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReturnOrderService {

    private static final Set<String> CONDITIONS = Set.of("GOOD", "DAMAGED", "UNUSABLE");
    private static final Set<String> DISPOSITIONS = Set.of("RESTOCK", "WRITE_OFF", "QUARANTINE");

    private final ReturnOrderJpaRepository returnRepository;
    private final OrderJpaRepository orderRepository;
    private final InventoryRestClient inventoryRestClient;
    private final OutboxEventPublisher outboxEventPublisher;
    private final ObjectMapper objectMapper;

    @Transactional
    public ReturnOrderResponse initiate(UUID orderId, InitiateReturnRequest request) {
        OrderEntity order = orderRepository.findById(orderId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Order not found"));
        if (!"DELIVERED".equals(order.getStatus())) {
            throw new BusinessException("INVALID_STATE", "Returns can only be initiated for DELIVERED orders");
        }

        Map<UUID, Integer> availableByProduct = new HashMap<>();
        for (OrderItemEntity line : order.getItems()) {
            availableByProduct.merge(line.getProductId(), line.getQuantity(), Integer::sum);
        }

        for (InitiateReturnRequest.ReturnLine line : request.lines()) {
            int avail = availableByProduct.getOrDefault(line.productId(), 0);
            if (line.quantity() > avail) {
                throw new BusinessException("VALIDATION_ERROR",
                    "Return quantity exceeds ordered quantity for product " + line.productId());
            }
            availableByProduct.put(line.productId(), avail - line.quantity());
        }

        ReturnOrderEntity ret = new ReturnOrderEntity();
        ret.setOriginalOrderId(order.getOrderId());
        ret.setWarehouseId(order.getWarehouseId());
        ret.setInitiatedBy(request.initiatedBy());
        ret.setReason(request.reason());
        ret.setNotes(request.notes());
        ret.setRestockLocationId(request.restockLocationId());
        ret.setStatus("PENDING");

        for (InitiateReturnRequest.ReturnLine line : request.lines()) {
            ReturnItemEntity item = new ReturnItemEntity();
            item.setReturnOrder(ret);
            item.setProductId(line.productId());
            item.setQuantity(line.quantity());
            ret.getItems().add(item);
        }

        ReturnOrderEntity saved = returnRepository.save(ret);
        return ReturnOrderResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public Page<ReturnOrderResponse> list(Pageable pageable, String status) {
        if (status != null && !status.isBlank()) {
            return returnRepository.findAllByStatusOrderByCreatedAtDesc(status.trim(), pageable)
                .map(ReturnOrderResponse::from);
        }
        return returnRepository.findAllByOrderByCreatedAtDesc(pageable).map(ReturnOrderResponse::from);
    }

    @Transactional(readOnly = true)
    public ReturnOrderResponse get(UUID returnId) {
        return ReturnOrderResponse.from(
            returnRepository.findById(returnId)
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Return not found"))
        );
    }

    @Transactional
    public ReturnOrderResponse receive(UUID returnId) {
        ReturnOrderEntity ret = returnRepository.findById(returnId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Return not found"));
        if (!"PENDING".equals(ret.getStatus())) {
            throw new BusinessException("INVALID_STATE", "Return must be PENDING to receive");
        }
        ret.setStatus("RECEIVED");
        return ReturnOrderResponse.from(returnRepository.save(ret));
    }

    @Transactional
    public ReturnOrderResponse inspect(UUID returnId, InspectReturnRequest request) {
        ReturnOrderEntity ret = returnRepository.findById(returnId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Return not found"));
        if (!"RECEIVED".equals(ret.getStatus())) {
            throw new BusinessException("INVALID_STATE", "Return must be RECEIVED to inspect");
        }
        var expectedIds = ret.getItems().stream().map(ReturnItemEntity::getReturnItemId).collect(Collectors.toSet());
        var providedIds = request.items().stream().map(InspectReturnRequest.ItemCondition::returnItemId).collect(Collectors.toSet());
        if (!expectedIds.equals(providedIds)) {
            throw new BusinessException("VALIDATION_ERROR", "Conditions must be provided for every return line exactly once");
        }
        for (InspectReturnRequest.ItemCondition ic : request.items()) {
            if (!CONDITIONS.contains(ic.itemCondition())) {
                throw new BusinessException("VALIDATION_ERROR", "Invalid item condition: " + ic.itemCondition());
            }
            ReturnItemEntity item = ret.getItems().stream()
                .filter(i -> i.getReturnItemId().equals(ic.returnItemId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Return line not found"));
            item.setItemCondition(ic.itemCondition());
        }
        ret.setStatus("INSPECTED");
        return ReturnOrderResponse.from(returnRepository.save(ret));
    }

    @Transactional
    public ReturnOrderResponse process(UUID returnId, ProcessReturnRequest request) {
        ReturnOrderEntity ret = returnRepository.findById(returnId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Return not found"));
        if (!"INSPECTED".equals(ret.getStatus())) {
            throw new BusinessException("INVALID_STATE", "Return must be INSPECTED to process");
        }

        var expectedIds = ret.getItems().stream().map(ReturnItemEntity::getReturnItemId).collect(Collectors.toSet());
        var providedIds = request.items().stream().map(ProcessReturnRequest.ItemDisposition::returnItemId).collect(Collectors.toSet());
        if (!expectedIds.equals(providedIds)) {
            throw new BusinessException("VALIDATION_ERROR", "Dispositions must be provided for every return line exactly once");
        }

        boolean anyRestock = false;
        for (ProcessReturnRequest.ItemDisposition d : request.items()) {
            if (!DISPOSITIONS.contains(d.disposition())) {
                throw new BusinessException("VALIDATION_ERROR", "Invalid disposition: " + d.disposition());
            }
            ReturnItemEntity item = ret.getItems().stream()
                .filter(i -> i.getReturnItemId().equals(d.returnItemId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Return line not found"));
            item.setDisposition(d.disposition());

            if ("RESTOCK".equals(d.disposition())) {
                OrderEntity originalOrder = orderRepository.findById(ret.getOriginalOrderId())
                    .orElseThrow(() -> new BusinessException("NOT_FOUND", "Original order not found"));
                UUID companyId = originalOrder.getCompanyId();
                UUID locationId = inventoryRestClient.resolveLocationId(companyId, item.getProductId(), ret.getRestockLocationId());
                inventoryRestClient.adjustStock(
                    companyId,
                    item.getProductId(),
                    locationId,
                    item.getQuantity(),
                    "RETURN_RESTOCK:" + returnId
                );
                anyRestock = true;
            } else if ("WRITE_OFF".equals(d.disposition())) {
                // No stock increase — goods disposed; optional audit-only
            }
        }

        ret.setStatus(anyRestock ? "RESTOCKED" : "WRITTEN_OFF");
        ReturnOrderEntity saved = returnRepository.save(ret);

        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                "eventType", "order.return.processed",
                "returnId", saved.getReturnId().toString(),
                "originalOrderId", saved.getOriginalOrderId().toString(),
                "status", saved.getStatus()
            ));
            outboxEventPublisher.publish("order.return.processed", saved.getReturnId(), payload);
        } catch (JsonProcessingException e) {
            throw new BusinessException("INTERNAL_ERROR", "Failed to serialize return event");
        }

        return ReturnOrderResponse.from(saved);
    }
}

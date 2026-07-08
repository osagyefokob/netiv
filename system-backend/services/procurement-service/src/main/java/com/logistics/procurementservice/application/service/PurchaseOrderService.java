package com.logistics.procurementservice.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.logistics.procurementservice.api.exception.BusinessException;
import com.logistics.procurementservice.application.dto.request.CreatePurchaseOrderRequest;
import com.logistics.procurementservice.application.dto.response.PurchaseOrderResponse;
import com.logistics.procurementservice.infrastructure.messaging.OutboxEventPublisher;
import com.logistics.procurementservice.infrastructure.persistence.entity.PurchaseOrderEntity;
import com.logistics.procurementservice.infrastructure.persistence.entity.PurchaseOrderItemEntity;
import com.logistics.common.security.LogisticsTenantContext;
import com.logistics.procurementservice.infrastructure.persistence.repository.PurchaseOrderJpaRepository;
import com.logistics.procurementservice.infrastructure.persistence.repository.SupplierJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PurchaseOrderService {

    private static final Map<String, Set<String>> ALLOWED_TRANSITIONS = Map.of(
        "DRAFTED", Set.of("SUBMITTED", "CANCELLED"),
        "SUBMITTED", Set.of("ACKNOWLEDGED", "CANCELLED"),
        "ACKNOWLEDGED", Set.of("PARTIALLY_RECEIVED", "COMPLETED"),
        "PARTIALLY_RECEIVED", Set.of("COMPLETED")
    );

    private final PurchaseOrderJpaRepository purchaseOrderRepository;
    private final SupplierJpaRepository supplierRepository;
    private final OutboxEventPublisher outboxPublisher;
    private final ObjectMapper objectMapper;

    @Transactional
    public PurchaseOrderResponse createPurchaseOrder(CreatePurchaseOrderRequest request) {
        UUID cid = LogisticsTenantContext.getCompanyId();
        
        // Demo mode: Skip supplier validation - accept any valid UUID
        // Real-world would validate supplier exists:
        // supplierRepository.findBySupplierIdAndCompanyId(request.supplierId(), cid)
        //     .filter(s -> s.isActive())
        //     .orElseThrow(() -> new BusinessException("NOT_FOUND", "Supplier not found or inactive"));
        
        log.info("Creating purchase order for supplierId: {}, warehouseId: {}, createdBy: {}", 
            request.supplierId(), request.warehouseId(), request.createdBy());
        
        PurchaseOrderEntity po = new PurchaseOrderEntity();
        po.setCompanyId(cid);
        po.setSupplierId(request.supplierId());
        po.setWarehouseId(request.warehouseId());
        po.setCreatedBy(request.createdBy());
        po.setExpectedDelivery(request.expectedDelivery());
        po.setNotes(request.notes());
        po.setStatus("DRAFTED");

        BigDecimal total = BigDecimal.ZERO;
        for (CreatePurchaseOrderRequest.PurchaseOrderItemRequest line : request.items()) {
            PurchaseOrderItemEntity item = new PurchaseOrderItemEntity();
            item.setPurchaseOrder(po);
            item.setProductId(line.productId());
            item.setQuantityOrdered(line.quantityOrdered());
            item.setQuantityReceived(0);
            item.setUnitCost(line.unitCost());
            BigDecimal lineAmount = line.unitCost().multiply(BigDecimal.valueOf(line.quantityOrdered()));
            total = total.add(lineAmount);
            po.getItems().add(item);
        }
        po.setTotalAmount(total.setScale(2, java.math.RoundingMode.HALF_UP));

        PurchaseOrderEntity saved = purchaseOrderRepository.save(po);
        log.info("Purchase order created: poId={}, total={}", saved.getPurchaseOrderId(), saved.getTotalAmount());
        return PurchaseOrderResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public PurchaseOrderResponse getPurchaseOrder(UUID purchaseOrderId) {
        UUID cid = LogisticsTenantContext.getCompanyId();
        return purchaseOrderRepository.findByPurchaseOrderIdAndCompanyId(purchaseOrderId, cid)
            .map(PurchaseOrderResponse::from)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Purchase order not found"));
    }

    @Transactional(readOnly = true)
    public Page<PurchaseOrderResponse> listPurchaseOrders(Pageable pageable, String status) {
        UUID cid = LogisticsTenantContext.getCompanyId();
        if (status != null && !status.isBlank()) {
            return purchaseOrderRepository.findAllByCompanyIdAndStatus(cid, status, pageable).map(PurchaseOrderResponse::from);
        }
        return purchaseOrderRepository.findAllByCompanyId(cid, pageable).map(PurchaseOrderResponse::from);
    }

    @Transactional
    public PurchaseOrderResponse submitPurchaseOrder(UUID purchaseOrderId) {
        UUID cid = LogisticsTenantContext.getCompanyId();
        PurchaseOrderEntity po = purchaseOrderRepository.findByPurchaseOrderIdAndCompanyId(purchaseOrderId, cid)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Purchase order not found"));

        transitionTo(po, "SUBMITTED");
        PurchaseOrderEntity saved = purchaseOrderRepository.save(po);

        outboxPublisher.publish(
            "procurement.purchase_order.submitted",
            saved.getPurchaseOrderId(),
            buildSubmittedPayload(saved)
        );

        log.info("Purchase order submitted: poId={}", purchaseOrderId);
        return PurchaseOrderResponse.from(saved);
    }

    private void transitionTo(PurchaseOrderEntity po, String newStatus) {
        String current = po.getStatus();
        Set<String> allowed = ALLOWED_TRANSITIONS.get(current);
        if (allowed == null || !allowed.contains(newStatus)) {
            throw new BusinessException(
                "INVALID_STATE_TRANSITION",
                "Cannot transition purchase order from " + current + " to " + newStatus
            );
        }
        po.setStatus(newStatus);
    }

    private String buildSubmittedPayload(PurchaseOrderEntity po) {
        try {
            Map<String, Object> inner = new LinkedHashMap<>();
            inner.put("purchaseOrderId", po.getPurchaseOrderId().toString());
            inner.put("supplierId", po.getSupplierId().toString());
            inner.put("warehouseId", po.getWarehouseId().toString());
            inner.put("status", po.getStatus());
            inner.put("totalAmount", po.getTotalAmount());
            inner.put("createdBy", po.getCreatedBy().toString());
            List<Map<String, Object>> lines = po.getItems().stream().map(item -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("productId", item.getProductId().toString());
                m.put("quantityOrdered", item.getQuantityOrdered());
                m.put("unitCost", item.getUnitCost());
                return m;
            }).toList();
            inner.put("items", lines);
            return objectMapper.writeValueAsString(Map.of(
                "eventType", "procurement.purchase_order.submitted",
                "payload", inner
            ));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize outbox payload", e);
        }
    }
}

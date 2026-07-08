package com.logistics.warehouseservice.application.service;

import com.logistics.warehouseservice.api.exception.BusinessException;
import com.logistics.warehouseservice.application.dto.request.CreateReceiptRequest;
import com.logistics.warehouseservice.application.dto.response.ReceiptResponse;
import com.logistics.warehouseservice.infrastructure.messaging.OutboxEventPublisher;
import com.logistics.warehouseservice.infrastructure.persistence.entity.InboundReceiptEntity;
import com.logistics.warehouseservice.infrastructure.persistence.entity.ReceiptLineEntity;
import com.logistics.warehouseservice.infrastructure.persistence.repository.InboundReceiptJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReceiptService {

    private final InboundReceiptJpaRepository receiptRepository;
    private final OutboxEventPublisher outboxPublisher;

    @Transactional
    public ReceiptResponse createReceipt(CreateReceiptRequest request) {
        InboundReceiptEntity receipt = new InboundReceiptEntity();
        receipt.setPurchaseOrderId(request.purchaseOrderId());
        receipt.setWarehouseId(request.warehouseId());
        receipt.setReceivedBy(request.receivedBy());
        receipt.setStatus("PENDING");
        List<ReceiptLineEntity> lines = request.lines().stream().map(l -> {
            ReceiptLineEntity line = new ReceiptLineEntity();
            line.setReceipt(receipt);
            line.setProductId(l.productId());
            line.setLocationId(l.locationId());
            line.setQtyExpected(l.qtyExpected());
            line.setQtyReceived(l.qtyReceived());
            return line;
        }).toList();
        receipt.setLines(lines);
        InboundReceiptEntity saved = receiptRepository.save(receipt);
        log.info("Receipt created: id={}, po={}", saved.getReceiptId(), request.purchaseOrderId());
        return ReceiptResponse.from(saved);
    }

    @Transactional
    public ReceiptResponse confirmReceipt(UUID receiptId) {
        InboundReceiptEntity receipt = receiptRepository.findById(receiptId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Receipt not found"));
        if (!"PENDING".equals(receipt.getStatus())) {
            throw new BusinessException("INVALID_STATE_TRANSITION", "Receipt is not in PENDING status");
        }
        receipt.setStatus("CONFIRMED");
        receipt.setReceivedAt(java.time.Instant.now());
        receiptRepository.save(receipt);

        outboxPublisher.publish("warehouse.goods.received", receipt.getReceiptId(),
            String.format("{\"eventType\":\"warehouse.goods.received\",\"payload\":{\"receiptId\":\"%s\",\"purchaseOrderId\":\"%s\",\"warehouseId\":\"%s\"}}",
                receipt.getReceiptId(), receipt.getPurchaseOrderId(), receipt.getWarehouseId()));

        log.info("Receipt confirmed: id={}", receiptId);
        return ReceiptResponse.from(receipt);
    }

    @Transactional(readOnly = true)
    public Page<ReceiptResponse> listReceipts(int page, int limit, UUID warehouseId, String status) {
        Pageable p = PageRequest.of(page - 1, limit);
        Page<InboundReceiptEntity> entities;
        boolean hasStatus = status != null && !status.isBlank();
        if (warehouseId != null && hasStatus) {
            entities = receiptRepository.findAllByWarehouseIdAndStatus(warehouseId, status, p);
        } else if (warehouseId != null) {
            entities = receiptRepository.findAllByWarehouseId(warehouseId, p);
        } else if (hasStatus) {
            entities = receiptRepository.findAllByStatus(status, p);
        } else {
            entities = receiptRepository.findAll(p);
        }
        return entities.map(ReceiptResponse::from);
    }

    @Transactional
    public ReceiptResponse rejectReceipt(UUID receiptId, String reason) {
        InboundReceiptEntity receipt = receiptRepository.findById(receiptId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Receipt not found"));
        if (!"PENDING".equals(receipt.getStatus())) {
            throw new BusinessException("INVALID_STATE_TRANSITION", "Receipt is not in PENDING status");
        }
        receipt.setStatus("REJECTED");
        receipt.setNotes(reason);
        InboundReceiptEntity saved = receiptRepository.save(receipt);
        log.info("Receipt rejected: id={}", receiptId);
        return ReceiptResponse.from(saved);
    }
}

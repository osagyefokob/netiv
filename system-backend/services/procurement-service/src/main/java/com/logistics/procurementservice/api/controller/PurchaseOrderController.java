package com.logistics.procurementservice.api.controller;

import com.logistics.procurementservice.application.dto.request.CreatePurchaseOrderRequest;
import com.logistics.procurementservice.application.dto.response.PurchaseOrderResponse;
import com.logistics.procurementservice.application.service.PurchaseOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/procurement/purchase-orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    @PostMapping
    public ResponseEntity<PurchaseOrderResponse> createPurchaseOrder(
        @Valid @RequestBody CreatePurchaseOrderRequest request
    ) {
        PurchaseOrderResponse response = purchaseOrderService.createPurchaseOrder(request);
        return ResponseEntity
            .created(URI.create("/api/v1/procurement/purchase-orders/" + response.purchaseOrderId()))
            .body(response);
    }

    @GetMapping
    public ResponseEntity<Page<PurchaseOrderResponse>> listPurchaseOrders(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit,
        @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(purchaseOrderService.listPurchaseOrders(PageRequest.of(page - 1, limit), status));
    }

    @GetMapping("/{purchaseOrderId}")
    public ResponseEntity<PurchaseOrderResponse> getPurchaseOrder(@PathVariable UUID purchaseOrderId) {
        return ResponseEntity.ok(purchaseOrderService.getPurchaseOrder(purchaseOrderId));
    }

    @PostMapping("/{purchaseOrderId}/submit")
    public ResponseEntity<PurchaseOrderResponse> submitPurchaseOrder(@PathVariable UUID purchaseOrderId) {
        return ResponseEntity.ok(purchaseOrderService.submitPurchaseOrder(purchaseOrderId));
    }
}

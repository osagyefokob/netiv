package com.logistics.warehouseservice.api.controller;

import com.logistics.warehouseservice.application.dto.request.CreateReceiptRequest;
import com.logistics.warehouseservice.application.dto.request.RejectReceiptRequest;
import com.logistics.warehouseservice.application.dto.response.ReceiptResponse;
import com.logistics.warehouseservice.application.service.ReceiptService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/warehouse/receipts")
@RequiredArgsConstructor
public class ReceiptController {

    private final ReceiptService receiptService;

    @GetMapping
    public ResponseEntity<Page<ReceiptResponse>> listReceipts(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit,
        @RequestParam(required = false) UUID warehouseId,
        @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(receiptService.listReceipts(page, limit, warehouseId, status));
    }

    @PostMapping
    public ResponseEntity<ReceiptResponse> createReceipt(@Valid @RequestBody CreateReceiptRequest request) {
        ReceiptResponse response = receiptService.createReceipt(request);
        return ResponseEntity
            .created(URI.create("/api/v1/warehouse/receipts/" + response.receiptId()))
            .body(response);
    }

    @PostMapping("/{receiptId}/confirm")
    public ResponseEntity<ReceiptResponse> confirmReceipt(@PathVariable UUID receiptId) {
        return ResponseEntity.ok(receiptService.confirmReceipt(receiptId));
    }

    @PostMapping("/{receiptId}/reject")
    public ResponseEntity<ReceiptResponse> rejectReceipt(
        @PathVariable UUID receiptId,
        @Valid @RequestBody RejectReceiptRequest request
    ) {
        return ResponseEntity.ok(receiptService.rejectReceipt(receiptId, request.reason()));
    }
}

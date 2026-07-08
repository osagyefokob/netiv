package com.logistics.ordermanagementservice.api.controller;

import com.logistics.ordermanagementservice.application.dto.request.InspectReturnRequest;
import com.logistics.ordermanagementservice.application.dto.request.ProcessReturnRequest;
import com.logistics.ordermanagementservice.application.dto.response.ReturnOrderResponse;
import com.logistics.ordermanagementservice.application.service.ReturnOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders/returns")
@RequiredArgsConstructor
public class ReturnOrderController {

    private final ReturnOrderService returnOrderService;

    @GetMapping
    public ResponseEntity<Page<ReturnOrderResponse>> list(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit,
        @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(returnOrderService.list(PageRequest.of(page - 1, limit), status));
    }

    @GetMapping("/{returnId}")
    public ResponseEntity<ReturnOrderResponse> get(@PathVariable UUID returnId) {
        return ResponseEntity.ok(returnOrderService.get(returnId));
    }

    @PatchMapping("/{returnId}/receive")
    public ResponseEntity<ReturnOrderResponse> receive(@PathVariable UUID returnId) {
        return ResponseEntity.ok(returnOrderService.receive(returnId));
    }

    @PatchMapping("/{returnId}/inspect")
    public ResponseEntity<ReturnOrderResponse> inspect(
        @PathVariable UUID returnId,
        @Valid @RequestBody InspectReturnRequest request
    ) {
        return ResponseEntity.ok(returnOrderService.inspect(returnId, request));
    }

    @PatchMapping("/{returnId}/process")
    public ResponseEntity<ReturnOrderResponse> process(
        @PathVariable UUID returnId,
        @Valid @RequestBody ProcessReturnRequest request
    ) {
        return ResponseEntity.ok(returnOrderService.process(returnId, request));
    }
}

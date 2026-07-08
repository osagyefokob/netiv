package com.logistics.inventoryservice.api.controller;

import com.logistics.inventoryservice.application.dto.response.BatchResponse;
import com.logistics.inventoryservice.application.service.BatchQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/inventory/batches")
@RequiredArgsConstructor
public class BatchController {

    private final BatchQueryService batchQueryService;

    @GetMapping
    public ResponseEntity<Page<BatchResponse>> listBatches(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(batchQueryService.listBatches(page, limit));
    }
}

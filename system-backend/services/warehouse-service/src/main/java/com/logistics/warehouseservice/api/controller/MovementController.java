package com.logistics.warehouseservice.api.controller;

import com.logistics.warehouseservice.application.dto.response.StockMovementResponse;
import com.logistics.warehouseservice.application.service.MovementQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/warehouse/movements")
@RequiredArgsConstructor
public class MovementController {

    private final MovementQueryService movementQueryService;

    @GetMapping
    public ResponseEntity<Page<StockMovementResponse>> listMovements(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(movementQueryService.listMovements(page, limit));
    }
}

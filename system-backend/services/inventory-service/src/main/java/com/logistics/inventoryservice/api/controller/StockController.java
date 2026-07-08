package com.logistics.inventoryservice.api.controller;

import com.logistics.inventoryservice.application.dto.request.AdjustStockRequest;
import com.logistics.inventoryservice.application.dto.request.ReserveStockRequest;
import com.logistics.inventoryservice.application.dto.response.ReservationResponse;
import com.logistics.inventoryservice.application.dto.response.StockLevelResponse;
import com.logistics.inventoryservice.application.service.StockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/inventory/stock")
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;

    @GetMapping
    public ResponseEntity<Page<StockLevelResponse>> listStockLevels(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(stockService.listStockLevels(page, limit));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<List<StockLevelResponse>> lowStock() {
        return ResponseEntity.ok(stockService.listLowStockLevels());
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<List<StockLevelResponse>> stockByProduct(@PathVariable UUID productId) {
        return ResponseEntity.ok(stockService.listStockByProduct(productId));
    }

    @PostMapping("/reserve")
    public ResponseEntity<ReservationResponse> reserveStock(@Valid @RequestBody ReserveStockRequest request) {
        return ResponseEntity.ok(stockService.reserveStock(request));
    }

    @PostMapping("/release/{orderId}")
    public ResponseEntity<Void> releaseStock(
        @PathVariable UUID orderId,
        @RequestParam(defaultValue = "SAGA_COMPENSATION") String reason
    ) {
        stockService.releaseStock(orderId, reason);
        return ResponseEntity.noContent().build();
    }

    /** Manual adjustment (returns restock, damage, corrections). */
    @PostMapping("/adjust")
    public ResponseEntity<StockLevelResponse> adjustStock(@Valid @RequestBody AdjustStockRequest request) {
        return ResponseEntity.ok(stockService.adjustStock(request));
    }
}

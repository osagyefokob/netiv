package com.logistics.warehouseservice.api.controller;

import com.logistics.warehouseservice.application.dto.request.CreateWarehouseRequest;
import com.logistics.warehouseservice.application.dto.request.UpdateWarehouseRequest;
import com.logistics.warehouseservice.application.dto.response.WarehouseResponse;
import com.logistics.warehouseservice.application.service.WarehouseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/warehouse/warehouses")
@RequiredArgsConstructor
public class WarehouseController {

    private final WarehouseService warehouseService;

    @PostMapping
    public ResponseEntity<WarehouseResponse> createWarehouse(@Valid @RequestBody CreateWarehouseRequest request) {
        WarehouseResponse response = warehouseService.createWarehouse(request);
        return ResponseEntity
            .created(URI.create("/api/v1/warehouse/warehouses/" + response.warehouseId()))
            .body(response);
    }

    @GetMapping
    public ResponseEntity<Page<WarehouseResponse>> listWarehouses(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(warehouseService.listWarehouses(PageRequest.of(page - 1, limit)));
    }

    @GetMapping("/{warehouseId}")
    public ResponseEntity<WarehouseResponse> getWarehouse(@PathVariable UUID warehouseId) {
        return ResponseEntity.ok(warehouseService.getWarehouse(warehouseId));
    }

    @PutMapping("/{warehouseId}")
    public ResponseEntity<WarehouseResponse> updateWarehouse(
        @PathVariable UUID warehouseId,
        @Valid @RequestBody UpdateWarehouseRequest request
    ) {
        return ResponseEntity.ok(warehouseService.updateWarehouse(warehouseId, request));
    }
}

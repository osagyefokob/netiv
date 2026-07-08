package com.logistics.procurementservice.api.controller;

import com.logistics.procurementservice.application.dto.request.CreateSupplierRequest;
import com.logistics.procurementservice.application.dto.response.SupplierResponse;
import com.logistics.procurementservice.application.service.SupplierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/procurement/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    @PostMapping
    public ResponseEntity<SupplierResponse> createSupplier(@Valid @RequestBody CreateSupplierRequest request) {
        SupplierResponse response = supplierService.createSupplier(request);
        return ResponseEntity
            .created(URI.create("/api/v1/procurement/suppliers/" + response.supplierId()))
            .body(response);
    }

    @GetMapping
    public ResponseEntity<Page<SupplierResponse>> listSuppliers(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(supplierService.listSuppliers(PageRequest.of(page - 1, limit)));
    }

    @GetMapping("/{supplierId}")
    public ResponseEntity<SupplierResponse> getSupplier(@PathVariable UUID supplierId) {
        return ResponseEntity.ok(supplierService.getSupplier(supplierId));
    }
}

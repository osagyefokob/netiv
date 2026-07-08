package com.logistics.inventoryservice.api.controller;

import com.logistics.inventoryservice.application.dto.request.CreateProductRequest;
import com.logistics.inventoryservice.application.dto.request.UpdateProductRequest;
import com.logistics.inventoryservice.application.dto.response.InventoryImportResult;
import com.logistics.inventoryservice.application.dto.response.ProductResponse;
import com.logistics.inventoryservice.application.service.InventoryImportService;
import com.logistics.inventoryservice.application.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/inventory/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final InventoryImportService inventoryImportService;

    @PostMapping
    public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody CreateProductRequest request) {
        ProductResponse response = productService.createProduct(request);
        return ResponseEntity
            .created(URI.create("/api/v1/inventory/products/" + response.productId()))
            .body(response);
    }

    @GetMapping
    public ResponseEntity<Page<ProductResponse>> listProducts(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(productService.listProducts(PageRequest.of(page - 1, limit)));
    }

    @GetMapping("/{productId}")
    public ResponseEntity<ProductResponse> getProduct(@PathVariable UUID productId) {
        return ResponseEntity.ok(productService.getProduct(productId));
    }

    @PutMapping("/{productId}")
    public ResponseEntity<ProductResponse> updateProduct(
        @PathVariable UUID productId,
        @Valid @RequestBody UpdateProductRequest request
    ) {
        return ResponseEntity.ok(productService.updateProduct(productId, request));
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> deleteProduct(@PathVariable UUID productId) {
        productService.deleteProduct(productId);
        return ResponseEntity.noContent().build();
    }

    /**
     * CSV/XLSX columns: sku, name, category, unit_of_measure, unit_cost, reorder_threshold, quantity_on_hand, location_id
     * Optional: description
     */
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('COMPANY_ADMIN')")
    public ResponseEntity<InventoryImportResult> importProducts(
        @RequestPart("file") MultipartFile file,
        @RequestParam(value = "format", defaultValue = "csv") String format
    ) throws Exception {
        return ResponseEntity.ok(inventoryImportService.importFile(file, format));
    }
}

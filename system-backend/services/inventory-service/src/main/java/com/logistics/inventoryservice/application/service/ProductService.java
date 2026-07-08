package com.logistics.inventoryservice.application.service;

import com.logistics.inventoryservice.api.exception.BusinessException;
import com.logistics.inventoryservice.application.dto.request.CreateProductRequest;
import com.logistics.inventoryservice.application.dto.request.UpdateProductRequest;
import com.logistics.inventoryservice.application.dto.response.ProductResponse;
import com.logistics.inventoryservice.infrastructure.messaging.OutboxEventPublisher;
import com.logistics.inventoryservice.infrastructure.persistence.entity.ProductEntity;
import com.logistics.inventoryservice.infrastructure.persistence.repository.ProductJpaRepository;
import com.logistics.inventoryservice.infrastructure.security.InventoryTenant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductJpaRepository productRepository;
    private final OutboxEventPublisher outboxPublisher;

    @Transactional
    public ProductResponse createProduct(CreateProductRequest request) {
        UUID companyId = InventoryTenant.currentCompanyId();
        if (productRepository.existsByCompanyIdAndSku(companyId, request.sku())) {
            throw new BusinessException("CONFLICT", "A product with SKU " + request.sku() + " already exists");
        }

        ProductEntity entity = new ProductEntity();
        entity.setCompanyId(companyId);
        entity.setSku(request.sku());
        entity.setName(request.name());
        entity.setDescription(request.description());
        entity.setCategory(request.category());
        entity.setUnitOfMeasure(request.unitOfMeasure());
        entity.setUnitCost(request.unitCost());
        entity.setReorderThreshold(request.reorderThreshold());
        entity.setActive(true);

        ProductEntity saved = productRepository.save(entity);

        outboxPublisher.publish(
            "inventory.product.created",
            saved.getProductId(),
            buildProductEvent("inventory.product.created", saved)
        );

        log.info("Product created: productId={}, sku={}", saved.getProductId(), saved.getSku());
        return ProductResponse.from(saved);
    }

    @Transactional
    public ProductResponse updateProduct(UUID productId, UpdateProductRequest request) {
        UUID companyId = InventoryTenant.currentCompanyId();
        ProductEntity entity = productRepository.findByProductIdAndCompanyId(productId, companyId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Product not found"));

        if (request.name() != null) entity.setName(request.name());
        if (request.description() != null) entity.setDescription(request.description());
        if (request.unitCost() != null) entity.setUnitCost(request.unitCost());
        if (request.reorderThreshold() != null) entity.setReorderThreshold(request.reorderThreshold());

        ProductEntity saved = productRepository.save(entity);
        log.info("Product updated: productId={}", productId);
        return ProductResponse.from(saved);
    }

    @Transactional
    public void deleteProduct(UUID productId) {
        UUID companyId = InventoryTenant.currentCompanyId();
        ProductEntity entity = productRepository.findByProductIdAndCompanyId(productId, companyId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Product not found"));
        productRepository.delete(entity);
        log.info("Product soft-deleted: productId={}", productId);
    }

    @Transactional(readOnly = true)
    public ProductResponse getProduct(UUID productId) {
        UUID companyId = InventoryTenant.currentCompanyId();
        return productRepository.findByProductIdAndCompanyId(productId, companyId)
            .map(ProductResponse::from)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Product not found"));
    }

    @Transactional(readOnly = true)
    public Page<ProductResponse> listProducts(Pageable pageable) {
        UUID companyId = InventoryTenant.currentCompanyId();
        return productRepository.findAllByCompanyIdAndIsActiveTrue(companyId, pageable).map(ProductResponse::from);
    }

    private String buildProductEvent(String type, ProductEntity p) {
        return String.format(
            "{\"eventType\":\"%s\",\"payload\":{\"productId\":\"%s\",\"sku\":\"%s\"," +
            "\"name\":\"%s\",\"category\":\"%s\",\"unitOfMeasure\":\"%s\",\"reorderThreshold\":%d}}",
            type, p.getProductId(), p.getSku(), p.getName(), p.getCategory(),
            p.getUnitOfMeasure(), p.getReorderThreshold()
        );
    }
}

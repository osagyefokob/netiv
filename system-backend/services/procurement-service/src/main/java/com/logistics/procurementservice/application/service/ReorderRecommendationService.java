package com.logistics.procurementservice.application.service;

import com.logistics.procurementservice.api.exception.BusinessException;
import com.logistics.procurementservice.application.dto.response.ReorderRecommendationResponse;
import com.logistics.procurementservice.infrastructure.client.dto.InventoryProductDto;
import com.logistics.procurementservice.infrastructure.client.dto.InventoryStockLevelDto;
import com.logistics.procurementservice.infrastructure.client.dto.OrderPipelineDemandDto;
import com.logistics.procurementservice.infrastructure.client.dto.ProductOutboundSummaryDto;
import com.logistics.procurementservice.infrastructure.client.dto.WarehouseLocationDto;
import com.logistics.common.security.LogisticsTenantContext;
import com.logistics.procurementservice.infrastructure.persistence.entity.SupplierEntity;
import com.logistics.procurementservice.infrastructure.persistence.repository.PurchaseOrderItemJpaRepository;
import com.logistics.procurementservice.infrastructure.persistence.repository.SupplierJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReorderRecommendationService {

    private static final int OUTBOUND_DAYS = 30;

    private final @Qualifier("inventoryRestClient") RestClient inventoryRestClient;
    private final @Qualifier("warehouseRestClient") RestClient warehouseRestClient;
    private final @Qualifier("ordersRestClient") RestClient ordersRestClient;
    private final @Qualifier("reportingRestClient") RestClient reportingRestClient;
    private final PurchaseOrderItemJpaRepository purchaseOrderItemJpaRepository;
    private final SupplierJpaRepository supplierJpaRepository;

    public List<ReorderRecommendationResponse> listRecommendations(String urgencyFilter) {
        List<InventoryStockLevelDto> levels = fetchLowStock();
        if (levels.isEmpty()) {
            return List.of();
        }

        Map<UUID, Integer> stockByProduct = new HashMap<>();
        Map<UUID, InventoryStockLevelDto> firstLevel = new HashMap<>();
        for (InventoryStockLevelDto lv : levels) {
            stockByProduct.merge(lv.productId(), lv.quantityAvailable(), Integer::sum);
            firstLevel.putIfAbsent(lv.productId(), lv);
        }

        Map<UUID, Long> pipelineByProduct = fetchPipelineDemand();
        Map<UUID, Long> pendingPoByProduct = fetchPendingPoByProduct();
        Map<UUID, Long> outbound30ByProduct = fetchOutbound30Days();

        UUID companyId = LogisticsTenantContext.getCompanyId();
        SupplierEntity preferred = supplierJpaRepository.findAllByCompanyIdAndIsActiveTrue(companyId).stream()
            .min(Comparator.comparingInt(SupplierEntity::getLeadTimeDays))
            .orElse(null);
        UUID prefId = preferred != null ? preferred.getSupplierId() : null;
        String prefName = preferred != null ? preferred.getName() : null;
        int leadDays = preferred != null ? preferred.getLeadTimeDays() : 7;

        List<ReorderRecommendationResponse> out = new ArrayList<>();
        for (UUID productId : stockByProduct.keySet()) {
            InventoryProductDto p = fetchProduct(productId);
            InventoryStockLevelDto lv = firstLevel.get(productId);
            WarehouseLocationDto loc = fetchLocationSafe(lv.locationId());

            int avail = stockByProduct.get(productId);
            int threshold = p.reorderThreshold();
            long openDemand = pipelineByProduct.getOrDefault(productId, 0L);
            long pendingPo = pendingPoByProduct.getOrDefault(productId, 0L);
            long out30 = outbound30ByProduct.getOrDefault(productId, 0L);
            double avgDaily = out30 / (double) OUTBOUND_DAYS;

            Double daysUntil;
            if (avgDaily > 1e-6) {
                daysUntil = avail / avgDaily;
            } else {
                daysUntil = null;
            }

            int recommended = Math.max(0, 2 * threshold - avail);

            String urgency;
            if (daysUntil != null && daysUntil < 3.0) {
                urgency = "CRITICAL";
            } else if (daysUntil != null && daysUntil < leadDays) {
                urgency = "HIGH";
            } else {
                urgency = "MEDIUM";
            }

            boolean orderBy = daysUntil != null && daysUntil <= leadDays;

            out.add(new ReorderRecommendationResponse(
                p.productId(),
                p.sku(),
                p.name(),
                p.category(),
                lv.locationId(),
                loc.locationCode() != null ? loc.locationCode() : "—",
                loc.warehouseId(),
                avail,
                threshold,
                recommended,
                daysUntil,
                leadDays,
                prefId,
                prefName,
                openDemand,
                pendingPo,
                avgDaily,
                urgency,
                orderBy
            ));
        }

        out.sort(Comparator
            .comparingInt((ReorderRecommendationResponse r) -> urgencyRank(r.urgency()))
            .thenComparing(r -> r.daysUntilStockout() != null ? r.daysUntilStockout() : Double.MAX_VALUE));

        if (urgencyFilter != null && !urgencyFilter.isBlank()) {
            String u = urgencyFilter.trim().toUpperCase();
            out = out.stream().filter(r -> u.equals(r.urgency())).collect(Collectors.toList());
        }

        return out;
    }

    private static int urgencyRank(String u) {
        return switch (u) {
            case "CRITICAL" -> 0;
            case "HIGH" -> 1;
            default -> 2;
        };
    }

    private Map<UUID, Long> fetchPendingPoByProduct() {
        Map<UUID, Long> m = new HashMap<>();
        for (Object[] row : purchaseOrderItemJpaRepository.sumPendingInboundByProduct(LogisticsTenantContext.getCompanyId())) {
            m.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        return m;
    }

    private Map<UUID, Long> fetchPipelineDemand() {
        try {
            List<OrderPipelineDemandDto> body = ordersRestClient.get()
                .uri("/api/v1/orders/analytics/pipeline-demand-by-product")
                .header("X-Company-Id", LogisticsTenantContext.getCompanyId().toString())
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
            if (body == null) {
                return Map.of();
            }
            return body.stream().collect(Collectors.toMap(OrderPipelineDemandDto::productId, OrderPipelineDemandDto::openQuantity));
        } catch (RestClientException e) {
            return Map.of();
        }
    }

    private Map<UUID, Long> fetchOutbound30Days() {
        try {
            List<ProductOutboundSummaryDto> body = reportingRestClient.get()
                .uri("/api/v1/reports/inventory/product-outbound-summary?days={days}", OUTBOUND_DAYS)
                .header("X-Company-Id", LogisticsTenantContext.getCompanyId().toString())
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
            if (body == null) {
                return Map.of();
            }
            return body.stream().collect(Collectors.toMap(ProductOutboundSummaryDto::productId, ProductOutboundSummaryDto::totalOutbound));
        } catch (RestClientException e) {
            return Map.of();
        }
    }

    private List<InventoryStockLevelDto> fetchLowStock() {
        Exception last = null;
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                List<InventoryStockLevelDto> body = inventoryRestClient.get()
                    .uri("/api/v1/inventory/stock/low-stock")
                    .header("X-Company-Id", LogisticsTenantContext.getCompanyId().toString())
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
                return body != null ? body : List.of();
            } catch (Exception e) {
                last = e;
                pause(150L * attempt);
            }
        }
        throw new BusinessException("SERVICE_UNAVAILABLE",
            "Inventory service unavailable: " + (last != null ? last.getMessage() : "unknown"));
    }

    private InventoryProductDto fetchProduct(UUID productId) {
        Exception last = null;
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                InventoryProductDto p = inventoryRestClient.get()
                    .uri("/api/v1/inventory/products/{productId}", productId)
                    .header("X-Company-Id", LogisticsTenantContext.getCompanyId().toString())
                    .retrieve()
                    .body(InventoryProductDto.class);
                if (p == null) {
                    throw new BusinessException("NOT_FOUND", "Product not found: " + productId);
                }
                return p;
            } catch (BusinessException e) {
                throw e;
            } catch (Exception e) {
                last = e;
                pause(150L * attempt);
            }
        }
        throw new BusinessException("SERVICE_UNAVAILABLE",
            "Could not load product " + productId + ": " + (last != null ? last.getMessage() : "unknown"));
    }

    private WarehouseLocationDto fetchLocationSafe(UUID locationId) {
        try {
            WarehouseLocationDto loc = warehouseRestClient.get()
                .uri("/api/v1/warehouse/locations/{locationId}", locationId)
                .header("X-Company-Id", LogisticsTenantContext.getCompanyId().toString())
                .retrieve()
                .body(WarehouseLocationDto.class);
            return loc != null ? loc : new WarehouseLocationDto(locationId, null, "—");
        } catch (RestClientException ex) {
            return new WarehouseLocationDto(locationId, null, "—");
        }
    }

    private void pause(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException("SERVICE_UNAVAILABLE", "Interrupted");
        }
    }
}

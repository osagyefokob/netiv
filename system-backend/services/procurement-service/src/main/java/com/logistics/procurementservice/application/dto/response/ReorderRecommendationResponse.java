package com.logistics.procurementservice.application.dto.response;

import java.util.UUID;

/**
 * Smart reorder line: deterministic ranking using inventory, open order demand,
 * pending PO supply, 30-day outbound velocity, and preferred supplier lead time.
 */
public record ReorderRecommendationResponse(
    UUID productId,
    String sku,
    String productName,
    String category,
    UUID locationId,
    String locationCode,
    UUID warehouseId,
    int currentStock,
    int reorderThreshold,
    int recommendedQty,
    Double daysUntilStockout,
    Integer leadTimeDays,
    UUID preferredSupplierId,
    String preferredSupplierName,
    long openOrderDemand,
    long pendingPoQuantity,
    double avgDailyDemand,
    String urgency,
    boolean recommendOrderBy
) {}

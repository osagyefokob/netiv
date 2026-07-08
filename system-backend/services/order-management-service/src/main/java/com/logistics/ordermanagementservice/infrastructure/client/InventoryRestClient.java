package com.logistics.ordermanagementservice.infrastructure.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.logistics.ordermanagementservice.api.exception.BusinessException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Component
public class InventoryRestClient {

    private final RestClient inventoryRestClient;
    private final ObjectMapper objectMapper;

    public InventoryRestClient(
        @Qualifier("inventoryHttpClient") RestClient inventoryRestClient,
        ObjectMapper objectMapper
    ) {
        this.inventoryRestClient = inventoryRestClient;
        this.objectMapper = objectMapper;
    }

    public UUID resolveLocationId(UUID companyId, UUID productId, UUID preferredLocationId) {
        if (preferredLocationId != null) {
            return preferredLocationId;
        }
        var spec = inventoryRestClient.get()
            .uri("/api/v1/inventory/stock/product/{productId}", productId);
        if (companyId != null) {
            spec = spec.header("X-Company-Id", companyId.toString());
        }
        String body = spec.retrieve().body(String.class);
        try {
            JsonNode arr = objectMapper.readTree(body);
            if (arr.isArray() && !arr.isEmpty() && arr.get(0).hasNonNull("locationId")) {
                return UUID.fromString(arr.get(0).get("locationId").asText());
            }
        } catch (Exception e) {
            throw new BusinessException("NOT_FOUND", "Could not resolve stock location for product " + productId);
        }
        throw new BusinessException("NOT_FOUND", "No stock levels for product " + productId);
    }

    public void adjustStock(UUID companyId, UUID productId, UUID locationId, int quantityDelta, String reason) {
        var req = inventoryRestClient.post()
            .uri("/api/v1/inventory/stock/adjust");
        if (companyId != null) {
            req = req.header("X-Company-Id", companyId.toString());
        }
        req.contentType(MediaType.APPLICATION_JSON)
            .body(new AdjustPayload(productId, locationId, quantityDelta, reason))
            .retrieve()
            .toBodilessEntity();
    }

    private record AdjustPayload(UUID productId, UUID locationId, int quantityDelta, String reason) {}
}

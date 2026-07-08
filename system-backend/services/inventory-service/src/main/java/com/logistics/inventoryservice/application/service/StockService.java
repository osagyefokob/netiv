package com.logistics.inventoryservice.application.service;

import com.logistics.inventoryservice.api.exception.BusinessException;
import com.logistics.inventoryservice.application.dto.request.AdjustStockRequest;
import com.logistics.inventoryservice.application.dto.request.ReserveStockRequest;
import com.logistics.inventoryservice.application.dto.response.ReservationResponse;
import com.logistics.inventoryservice.application.dto.response.StockLevelResponse;
import com.logistics.inventoryservice.infrastructure.messaging.OutboxEventPublisher;
import com.logistics.inventoryservice.infrastructure.persistence.entity.*;
import com.logistics.inventoryservice.infrastructure.persistence.repository.*;
import com.logistics.inventoryservice.infrastructure.security.InventoryTenant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockService {

    private final StockLevelJpaRepository stockLevelRepository;
    private final StockReservationJpaRepository reservationRepository;
    private final ProductJpaRepository productRepository;
    private final OutboxEventPublisher outboxPublisher;

    private UUID companyId() {
        return InventoryTenant.currentCompanyId();
    }

    private void assertProductInCompany(UUID productId) {
        productRepository.findByProductIdAndCompanyId(productId, companyId())
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Product not found"));

    }

    @Transactional
    public ReservationResponse reserveStock(ReserveStockRequest request) {
        if (reservationRepository.existsByOrderId(request.orderId())) {
            return reservationRepository.findByOrderId(request.orderId())
                .map(ReservationResponse::from)
                .orElseThrow();
        }

        List<StockLevelEntity> lockedLevels = new ArrayList<>();
        List<StockReservationItemEntity> items = new ArrayList<>();

        for (ReserveStockRequest.ReservationItem item : request.items()) {
            assertProductInCompany(item.productId());

            StockLevelEntity level = stockLevelRepository
                .findByProductIdAndLocationIdForUpdate(item.productId(), item.locationId())
                .orElseThrow(() -> new BusinessException("NOT_FOUND",
                    "No stock level found for product " + item.productId() +
                    " at location " + item.locationId()));

            if (level.getQuantityAvailable() < item.quantity()) {
                throw new BusinessException("INSUFFICIENT_STOCK",
                    "Insufficient stock for product " + item.productId() +
                    ": requested=" + item.quantity() + ", available=" + level.getQuantityAvailable());
            }

            level.setQuantityReserved(level.getQuantityReserved() + item.quantity());
            lockedLevels.add(level);

            StockReservationItemEntity lineItem = new StockReservationItemEntity();
            lineItem.setProductId(item.productId());
            lineItem.setLocationId(item.locationId());
            lineItem.setQuantity(item.quantity());
            items.add(lineItem);
        }

        stockLevelRepository.saveAll(lockedLevels);

        StockReservationEntity reservation = new StockReservationEntity();
        reservation.setOrderId(request.orderId());
        reservation.setStatus("CONFIRMED");
        reservation.setExpiresAt(Instant.now().plusSeconds(1800));
        reservation.setItems(items);
        items.forEach(i -> i.setReservation(reservation));

        StockReservationEntity saved = reservationRepository.save(reservation);

        outboxPublisher.publish(
            "inventory.stock.reserved",
            request.orderId(),
            buildReservedEvent(saved, request)
        );

        checkLowStock(request.items());

        log.info("Stock reserved: reservationId={}, orderId={}", saved.getReservationId(), request.orderId());
        return ReservationResponse.from(saved);
    }

    @Transactional
    public void releaseStock(UUID orderId, String reason) {
        StockReservationEntity reservation = reservationRepository.findByOrderId(orderId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Reservation not found for order " + orderId));

        if ("RELEASED".equals(reservation.getStatus())) {
            log.info("Release is no-op: reservation already released for orderId={}", orderId);
            return;
        }

        for (StockReservationItemEntity item : reservation.getItems()) {
            assertProductInCompany(item.getProductId());
            stockLevelRepository.findByProductIdAndLocationIdForUpdate(item.getProductId(), item.getLocationId())
                .ifPresent(level -> {
                    level.setQuantityReserved(
                        Math.max(0, level.getQuantityReserved() - item.getQuantity())
                    );
                    stockLevelRepository.save(level);
                });
        }

        reservation.setStatus("RELEASED");
        reservationRepository.save(reservation);

        outboxPublisher.publish(
            "inventory.stock.released",
            orderId,
            String.format("{\"eventType\":\"inventory.stock.released\"," +
                "\"payload\":{\"reservationId\":\"%s\",\"orderId\":\"%s\",\"reason\":\"%s\"}}",
                reservation.getReservationId(), orderId, reason)
        );

        log.info("Stock released: orderId={}, reason={}", orderId, reason);
    }

    @Transactional
    public StockLevelResponse adjustStock(AdjustStockRequest request) {
        assertProductInCompany(request.productId());

        StockLevelEntity level = stockLevelRepository
            .findByProductIdAndLocationIdForUpdate(request.productId(), request.locationId())
            .orElseThrow(() -> new BusinessException("NOT_FOUND",
                "No stock level for product " + request.productId() + " at location " + request.locationId()));

        int newOnHand = level.getQuantityOnHand() + request.quantityDelta();
        if (newOnHand < 0) {
            throw new BusinessException("VALIDATION_ERROR", "Adjustment would make on-hand quantity negative");
        }
        if (newOnHand < level.getQuantityReserved()) {
            throw new BusinessException("VALIDATION_ERROR", "On-hand cannot be below reserved quantity");
        }
        level.setQuantityOnHand(newOnHand);
        stockLevelRepository.saveAndFlush(level);

        outboxPublisher.publish(
            "inventory.stock.adjusted",
            request.productId(),
            String.format(
                "{\"eventType\":\"inventory.stock.adjusted\",\"productId\":\"%s\",\"locationId\":\"%s\",\"delta\":%d,\"reason\":\"%s\"}",
                request.productId(), request.locationId(), request.quantityDelta(),
                request.reason().replace("\"", "\\\"")
            )
        );

        log.info("Stock adjusted: productId={}, locationId={}, delta={}, reason={}",
            request.productId(), request.locationId(), request.quantityDelta(), request.reason());
        return stockLevelRepository.findById(level.getStockLevelId())
            .map(StockLevelResponse::from)
            .orElseThrow();
    }

    private void checkLowStock(List<ReserveStockRequest.ReservationItem> items) {
        UUID cid = companyId();
        for (ReserveStockRequest.ReservationItem item : items) {
            stockLevelRepository.findByProductIdAndLocationId(item.productId(), item.locationId())
                .ifPresent(level -> {
                    productRepository.findByProductIdAndCompanyId(level.getProductId(), cid).ifPresent(product -> {
                        if (level.getQuantityAvailable() <= product.getReorderThreshold()) {
                            outboxPublisher.publish(
                                "inventory.stock.low_stock_alert",
                                item.productId(),
                                String.format("{\"eventType\":\"inventory.stock.low_stock_alert\"," +
                                    "\"payload\":{\"productId\":\"%s\",\"sku\":\"%s\"," +
                                    "\"currentQuantity\":%d,\"reorderThreshold\":%d}}",
                                    product.getProductId(), product.getSku(),
                                    level.getQuantityAvailable(), product.getReorderThreshold())
                            );
                        }
                    });
                });
        }
    }

    private String buildReservedEvent(StockReservationEntity reservation, ReserveStockRequest request) {
        return String.format(
            "{\"eventType\":\"inventory.stock.reserved\"," +
            "\"payload\":{\"reservationId\":\"%s\",\"orderId\":\"%s\",\"expiresAt\":\"%s\"}}",
            reservation.getReservationId(), request.orderId(), reservation.getExpiresAt()
        );
    }

    @Transactional(readOnly = true)
    public Page<StockLevelResponse> listStockLevels(int page, int limit) {
        return stockLevelRepository.findPageByCompanyId(companyId(), PageRequest.of(page - 1, limit))
            .map(StockLevelResponse::from);
    }

    @Transactional(readOnly = true)
    public List<StockLevelResponse> listStockByProduct(UUID productId) {
        assertProductInCompany(productId);
        return stockLevelRepository.findAllByProductId(productId).stream()
            .map(StockLevelResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<StockLevelResponse> listLowStockLevels() {
        return stockLevelRepository.findAllBelowReorderThreshold(companyId()).stream()
            .map(StockLevelResponse::from)
            .toList();
    }
}

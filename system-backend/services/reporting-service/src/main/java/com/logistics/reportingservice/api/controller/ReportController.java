package com.logistics.reportingservice.api.controller;

import com.logistics.reportingservice.api.dto.*;
import com.logistics.reportingservice.infrastructure.persistence.entity.MovementAggregateEntity;
import com.logistics.reportingservice.infrastructure.persistence.entity.OrderSummaryEntity;
import com.logistics.reportingservice.infrastructure.persistence.repository.InventorySnapshotJpaRepository;
import com.logistics.reportingservice.infrastructure.persistence.repository.MovementAggregateJpaRepository;
import com.logistics.reportingservice.infrastructure.persistence.repository.OrderSummaryJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final InventorySnapshotJpaRepository inventorySnapshotJpaRepository;
    private final MovementAggregateJpaRepository movementAggregateJpaRepository;
    private final OrderSummaryJpaRepository orderSummaryJpaRepository;

    @GetMapping("/inventory/snapshot")
    public Page<InventorySnapshotResponse> listSnapshots(
        @RequestParam(required = false) UUID productId,
        @RequestParam(required = false) UUID warehouseId,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit
    ) {
        Pageable pageable = PageRequest.of(page - 1, limit);
        if (productId != null && warehouseId != null) {
            return inventorySnapshotJpaRepository
                .findAllByProductIdAndWarehouseId(productId, warehouseId, pageable)
                .map(InventorySnapshotResponse::from);
        }
        if (productId != null) {
            return inventorySnapshotJpaRepository.findAllByProductId(productId, pageable)
                .map(InventorySnapshotResponse::from);
        }
        if (warehouseId != null) {
            return inventorySnapshotJpaRepository.findAllByWarehouseId(warehouseId, pageable)
                .map(InventorySnapshotResponse::from);
        }
        return inventorySnapshotJpaRepository.findAll(pageable).map(InventorySnapshotResponse::from);
    }

    @GetMapping("/inventory/low-stock")
    public Page<InventorySnapshotResponse> lowStock(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return Page.empty(PageRequest.of(page - 1, limit));
    }

    @GetMapping("/movements/history")
    public Page<MovementAggregateResponse> movementHistory(
        @RequestParam(required = false) UUID warehouseId,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit
    ) {
        Pageable pageable = PageRequest.of(page - 1, limit);
        if (warehouseId != null) {
            return movementAggregateJpaRepository.findAllByWarehouseId(warehouseId, pageable)
                .map(MovementAggregateResponse::from);
        }
        return movementAggregateJpaRepository.findAll(pageable).map(MovementAggregateResponse::from);
    }

    @GetMapping("/inventory/product-outbound-summary")
    public List<ProductOutboundAggregateDto> productOutboundSummary(
        @RequestParam(defaultValue = "30") int days
    ) {
        int d = Math.max(1, Math.min(days, 365));
        Instant since = Instant.now().minus(d, ChronoUnit.DAYS);
        return movementAggregateJpaRepository.sumOutboundByProductSince(since).stream()
            .map(r -> new ProductOutboundAggregateDto((UUID) r[0], ((Number) r[1]).longValue()))
            .toList();
    }

    @GetMapping("/inventory/product/{productId}/sparkline")
    public List<Integer> productSparkline(
        @PathVariable UUID productId,
        @RequestParam(defaultValue = "7") int days
    ) {
        int d = Math.max(1, Math.min(days, 90));
        Instant since = Instant.now().minus(d, ChronoUnit.DAYS);
        return movementAggregateJpaRepository
            .findAllByProductIdAndPeriodStartGreaterThanEqualOrderByPeriodStartAsc(productId, since)
            .stream()
            .map(MovementAggregateEntity::getTotalOutbound)
            .toList();
    }

    @GetMapping("/movements/trends")
    public List<MovementTrendDto> movementTrends(
        @RequestParam(required = false) UUID warehouseId,
        @RequestParam(defaultValue = "week") String period
    ) {
        int pageSize = switch (period) {
            case "month" -> 30;
            case "quarter" -> 90;
            default -> 7;
        };
        Pageable pageable = PageRequest.of(0, pageSize);
        Page<MovementAggregateEntity> page =
            warehouseId != null
                ? movementAggregateJpaRepository.findAllByWarehouseIdOrderByPeriodStartDesc(warehouseId, pageable)
                : movementAggregateJpaRepository.findAllByOrderByPeriodStartDesc(pageable);
        DateTimeFormatter fmt = DateTimeFormatter.ISO_LOCAL_DATE.withZone(ZoneOffset.UTC);
        return page.getContent().stream()
            .map(e -> new MovementTrendDto(
                fmt.format(e.getPeriodStart()),
                e.getTotalInbound(),
                e.getTotalOutbound(),
                0
            ))
            .collect(Collectors.toList());
    }

    @GetMapping("/orders/summary")
    public OrderSummaryMetricsDto orderSummary(@RequestParam(required = false) UUID warehouseId) {
        List<OrderSummaryEntity> rows = warehouseId == null
            ? orderSummaryJpaRepository.findAll()
            : orderSummaryJpaRepository.findAllByWarehouseId(warehouseId, Pageable.unpaged()).getContent();

        Map<String, Integer> byStatus = new HashMap<>();
        BigDecimal totalRevenue = BigDecimal.ZERO;
        for (OrderSummaryEntity row : rows) {
            byStatus.merge(row.getStatus(), 1, Integer::sum);
            totalRevenue = totalRevenue.add(row.getTotalAmount());
        }
        int n = rows.size();
        double avg = n == 0 ? 0.0
            : totalRevenue.divide(BigDecimal.valueOf(n), 2, RoundingMode.HALF_UP).doubleValue();
        return new OrderSummaryMetricsDto(
            n,
            byStatus,
            totalRevenue.doubleValue(),
            avg,
            "all-time"
        );
    }

    @GetMapping("/orders/fulfilment-rate")
    public FulfilmentRateDto fulfilmentRate(@RequestParam(required = false) UUID warehouseId) {
        List<OrderSummaryEntity> rows = warehouseId == null
            ? orderSummaryJpaRepository.findAll()
            : orderSummaryJpaRepository.findAllByWarehouseId(warehouseId, Pageable.unpaged()).getContent();
        int total = rows.size();
        long fulfilled = rows.stream().filter(r -> "DELIVERED".equals(r.getStatus())).count();
        double rate = total == 0 ? 0.0 : (100.0 * fulfilled / total);
        return new FulfilmentRateDto(rate, (int) fulfilled, total, "all-time");
    }

    @GetMapping("/export/{reportType}")
    public ResponseEntity<byte[]> export(
        @PathVariable String reportType,
        @RequestParam(required = false) UUID warehouseId
    ) {
        String csv = "report,type,generatedAt\n" + reportType + ",snapshot," + Instant.now() + "\n";
        if (warehouseId != null) {
            csv += "warehouseId," + warehouseId + "\n";
        }
        byte[] bytes = csv.getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + reportType + ".csv\"")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(bytes);
    }
}

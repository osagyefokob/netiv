package com.logistics.reportingservice.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "movement_aggregates")
@Getter
@Setter
@NoArgsConstructor
public class MovementAggregateEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "agg_id", updatable = false, nullable = false)
    private UUID aggId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "warehouse_id", nullable = false)
    private UUID warehouseId;

    @Column(name = "period_start", nullable = false)
    private Instant periodStart;

    @Column(name = "period_end", nullable = false)
    private Instant periodEnd;

    @Column(name = "total_inbound", nullable = false)
    private int totalInbound;

    @Column(name = "total_outbound", nullable = false)
    private int totalOutbound;

    @Column(name = "net_change", insertable = false, updatable = false)
    private Integer netChange;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    protected void onPersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}

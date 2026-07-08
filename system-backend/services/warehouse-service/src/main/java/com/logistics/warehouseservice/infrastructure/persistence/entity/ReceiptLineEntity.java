package com.logistics.warehouseservice.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "receipt_lines")
@Getter
@Setter
@NoArgsConstructor
public class ReceiptLineEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "receipt_line_id", updatable = false, nullable = false)
    private UUID receiptLineId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "receipt_id", nullable = false)
    private InboundReceiptEntity receipt;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "batch_id")
    private UUID batchId;

    @Column(name = "location_id")
    private UUID locationId;

    @Column(name = "qty_expected", nullable = false)
    private int qtyExpected;

    @Column(name = "qty_received", nullable = false)
    private int qtyReceived = 0;

    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }
}

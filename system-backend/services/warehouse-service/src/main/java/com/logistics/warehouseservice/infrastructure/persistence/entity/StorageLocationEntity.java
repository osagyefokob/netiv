package com.logistics.warehouseservice.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "storage_locations")
@Getter
@Setter
@NoArgsConstructor
public class StorageLocationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "location_id", updatable = false, nullable = false)
    private UUID locationId;

    @Column(name = "warehouse_id", nullable = false, updatable = false)
    private UUID warehouseId;

    @Column(nullable = false, length = 10)
    private String zone;

    @Column(nullable = false, length = 10)
    private String aisle;

    @Column(nullable = false, length = 10)
    private String shelf;

    @Column(nullable = false, length = 10)
    private String bin;

    @Column(name = "location_code", insertable = false, updatable = false, length = 50)
    private String locationCode;

    @Column(name = "location_type", nullable = false, length = 20)
    private String locationType = "PICK";

    @Column(name = "max_capacity", nullable = false)
    private int maxCapacity;

    @Column(name = "current_occupancy", nullable = false)
    private int currentOccupancy = 0;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}

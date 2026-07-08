package com.logistics.warehouseservice.infrastructure.persistence.repository;

import com.logistics.warehouseservice.infrastructure.persistence.entity.InboundReceiptEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface InboundReceiptJpaRepository extends JpaRepository<InboundReceiptEntity, UUID> {

    Page<InboundReceiptEntity> findAllByWarehouseId(UUID warehouseId, Pageable pageable);

    Page<InboundReceiptEntity> findAllByStatus(String status, Pageable pageable);

    Page<InboundReceiptEntity> findAllByWarehouseIdAndStatus(UUID warehouseId, String status, Pageable pageable);
}

package com.logistics.procurementservice.infrastructure.persistence.repository;

import com.logistics.procurementservice.infrastructure.persistence.entity.PurchaseOrderEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PurchaseOrderJpaRepository extends JpaRepository<PurchaseOrderEntity, UUID> {
    Page<PurchaseOrderEntity> findAllBySupplierId(UUID supplierId, Pageable pageable);

    Page<PurchaseOrderEntity> findAllByStatus(String status, Pageable pageable);

    Page<PurchaseOrderEntity> findAllByCompanyId(UUID companyId, Pageable pageable);

    Page<PurchaseOrderEntity> findAllByCompanyIdAndStatus(UUID companyId, String status, Pageable pageable);

    Optional<PurchaseOrderEntity> findByPurchaseOrderIdAndCompanyId(UUID purchaseOrderId, UUID companyId);
}

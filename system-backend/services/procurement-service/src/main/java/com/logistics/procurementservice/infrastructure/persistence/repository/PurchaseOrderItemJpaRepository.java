package com.logistics.procurementservice.infrastructure.persistence.repository;

import com.logistics.procurementservice.infrastructure.persistence.entity.PurchaseOrderItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface PurchaseOrderItemJpaRepository extends JpaRepository<PurchaseOrderItemEntity, UUID> {

    @Query("""
        SELECT oi.productId, SUM(oi.quantityOrdered - oi.quantityReceived)
        FROM PurchaseOrderItemEntity oi
        JOIN oi.purchaseOrder po
        WHERE po.status IN ('SUBMITTED', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED')
          AND (oi.quantityOrdered - oi.quantityReceived) > 0
          AND po.companyId = :companyId
        GROUP BY oi.productId
        """)
    List<Object[]> sumPendingInboundByProduct(@Param("companyId") UUID companyId);
}

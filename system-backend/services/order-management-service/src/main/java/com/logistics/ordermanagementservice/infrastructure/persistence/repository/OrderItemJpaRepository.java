package com.logistics.ordermanagementservice.infrastructure.persistence.repository;

import com.logistics.ordermanagementservice.infrastructure.persistence.entity.OrderItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface OrderItemJpaRepository extends JpaRepository<OrderItemEntity, UUID> {

    List<OrderItemEntity> findAllByOrderOrderId(UUID orderId);

    @Query("""
        SELECT oi.productId, SUM(oi.quantity)
        FROM OrderItemEntity oi
        JOIN oi.order o
        WHERE o.status IN ('PENDING', 'PROCESSING')
          AND o.companyId = :companyId
        GROUP BY oi.productId
        """)
    List<Object[]> sumOpenPipelineQuantityByProduct(@Param("companyId") UUID companyId);
}

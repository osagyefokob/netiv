package com.logistics.reportingservice.infrastructure.persistence.repository;

import com.logistics.reportingservice.infrastructure.persistence.entity.MovementAggregateEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface MovementAggregateJpaRepository extends JpaRepository<MovementAggregateEntity, UUID> {

    Page<MovementAggregateEntity> findAllByWarehouseId(UUID warehouseId, Pageable pageable);

    Page<MovementAggregateEntity> findAllByOrderByPeriodStartDesc(Pageable pageable);

    Page<MovementAggregateEntity> findAllByWarehouseIdOrderByPeriodStartDesc(UUID warehouseId, Pageable pageable);

    @Query("""
        SELECT m.productId, SUM(m.totalOutbound)
        FROM MovementAggregateEntity m
        WHERE m.periodStart >= :since
        GROUP BY m.productId
        """)
    List<Object[]> sumOutboundByProductSince(@Param("since") Instant since);

    List<MovementAggregateEntity> findAllByProductIdAndPeriodStartGreaterThanEqualOrderByPeriodStartAsc(
        UUID productId,
        Instant since
    );
}

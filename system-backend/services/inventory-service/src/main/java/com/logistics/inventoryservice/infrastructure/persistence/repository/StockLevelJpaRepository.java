package com.logistics.inventoryservice.infrastructure.persistence.repository;

import com.logistics.inventoryservice.infrastructure.persistence.entity.StockLevelEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StockLevelJpaRepository extends JpaRepository<StockLevelEntity, UUID> {

    Optional<StockLevelEntity> findByProductIdAndLocationId(UUID productId, UUID locationId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM StockLevelEntity s WHERE s.productId = :productId AND s.locationId = :locationId")
    Optional<StockLevelEntity> findByProductIdAndLocationIdForUpdate(
        @Param("productId") UUID productId,
        @Param("locationId") UUID locationId
    );

    List<StockLevelEntity> findAllByProductId(UUID productId);

    @Query("SELECT s FROM StockLevelEntity s JOIN ProductEntity p ON s.productId = p.productId " +
           "WHERE (s.quantityOnHand - s.quantityReserved) <= p.reorderThreshold AND p.isActive = true AND p.companyId = :companyId")
    List<StockLevelEntity> findAllBelowReorderThreshold(@Param("companyId") UUID companyId);

    @Query("SELECT s FROM StockLevelEntity s JOIN ProductEntity p ON s.productId = p.productId WHERE p.companyId = :companyId")
    Page<StockLevelEntity> findPageByCompanyId(@Param("companyId") UUID companyId, Pageable pageable);

    @Modifying
    @Query(value = """
        DELETE FROM stock_levels s
        USING products p
        WHERE s.product_id = p.product_id
          AND p.company_id = :companyId
        """, nativeQuery = true)
    int deleteByCompanyId(@Param("companyId") UUID companyId);
}

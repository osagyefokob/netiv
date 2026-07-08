package com.logistics.inventoryservice.infrastructure.persistence.repository;

import com.logistics.inventoryservice.infrastructure.persistence.entity.BatchEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface BatchJpaRepository extends JpaRepository<BatchEntity, UUID> {

    @Query("SELECT b FROM BatchEntity b JOIN ProductEntity p ON b.productId = p.productId WHERE p.companyId = :companyId")
    Page<BatchEntity> findByCompanyId(@Param("companyId") UUID companyId, Pageable pageable);

    @Modifying
    @Query(value = """
        DELETE FROM batches b
        USING products p
        WHERE b.product_id = p.product_id
          AND p.company_id = :companyId
        """, nativeQuery = true)
    int deleteByCompanyId(@Param("companyId") UUID companyId);
}

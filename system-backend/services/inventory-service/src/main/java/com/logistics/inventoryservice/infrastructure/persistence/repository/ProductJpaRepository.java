package com.logistics.inventoryservice.infrastructure.persistence.repository;

import com.logistics.inventoryservice.infrastructure.persistence.entity.ProductEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductJpaRepository extends JpaRepository<ProductEntity, UUID> {
    Optional<ProductEntity> findBySku(String sku);

    Optional<ProductEntity> findByCompanyIdAndSku(UUID companyId, String sku);

    boolean existsByCompanyIdAndSku(UUID companyId, String sku);

    Page<ProductEntity> findAllByCompanyIdAndIsActiveTrue(UUID companyId, Pageable pageable);

    Page<ProductEntity> findAllByCompanyIdAndCategoryAndIsActiveTrue(UUID companyId, String category, Pageable pageable);

    Optional<ProductEntity> findByProductIdAndCompanyId(UUID productId, UUID companyId);

    List<ProductEntity> findAllByCompanyId(UUID companyId);

    @Modifying
    @Query("UPDATE ProductEntity p SET p.isActive = false WHERE p.companyId = :companyId AND p.sku NOT IN :skus")
    int deactivateMissingSkus(@Param("companyId") UUID companyId, @Param("skus") List<String> skus);

    @Modifying
    @Query("UPDATE ProductEntity p SET p.isActive = false WHERE p.companyId = :companyId")
    int deactivateAllByCompanyId(@Param("companyId") UUID companyId);
}

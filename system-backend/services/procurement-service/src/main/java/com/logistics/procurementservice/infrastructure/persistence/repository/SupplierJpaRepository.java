package com.logistics.procurementservice.infrastructure.persistence.repository;

import com.logistics.procurementservice.infrastructure.persistence.entity.SupplierEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SupplierJpaRepository extends JpaRepository<SupplierEntity, UUID> {
    Page<SupplierEntity> findAllByIsActiveTrue(Pageable pageable);

    Page<SupplierEntity> findAllByCompanyIdAndIsActiveTrue(UUID companyId, Pageable pageable);

    Optional<SupplierEntity> findBySupplierIdAndCompanyId(UUID supplierId, UUID companyId);

    List<SupplierEntity> findAllByCompanyIdAndIsActiveTrue(UUID companyId);
}

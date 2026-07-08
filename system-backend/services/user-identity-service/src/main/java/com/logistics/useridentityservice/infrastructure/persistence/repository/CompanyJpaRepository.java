package com.logistics.useridentityservice.infrastructure.persistence.repository;

import com.logistics.useridentityservice.infrastructure.persistence.entity.CompanyEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CompanyJpaRepository extends JpaRepository<CompanyEntity, UUID> {
    Optional<CompanyEntity> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);
}

package com.logistics.useridentityservice.infrastructure.persistence.repository;

import com.logistics.useridentityservice.infrastructure.persistence.entity.UserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserJpaRepository extends JpaRepository<UserEntity, UUID> {
    Optional<UserEntity> findByEmail(String email);

    boolean existsByEmail(String email);

    Page<UserEntity> findAllByIsActiveTrue(Pageable pageable);

    Page<UserEntity> findAllByIsActiveTrueAndCompanyCompanyId(UUID companyId, Pageable pageable);

    boolean existsByCompanyCompanyIdAndRole_NameAndIsActiveTrue(UUID companyId, String roleName);

    long countByCompanyCompanyIdAndRole_NameAndIsActiveTrueAndUserIdNot(UUID companyId, String roleName, UUID userId);
}

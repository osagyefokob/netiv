package com.logistics.ordermanagementservice.infrastructure.persistence.repository;

import com.logistics.ordermanagementservice.infrastructure.persistence.entity.ReturnOrderEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ReturnOrderJpaRepository extends JpaRepository<ReturnOrderEntity, UUID> {

    Page<ReturnOrderEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<ReturnOrderEntity> findAllByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
}

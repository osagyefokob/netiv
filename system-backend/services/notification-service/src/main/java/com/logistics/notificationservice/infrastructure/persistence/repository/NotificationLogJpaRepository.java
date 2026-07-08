package com.logistics.notificationservice.infrastructure.persistence.repository;

import com.logistics.notificationservice.infrastructure.persistence.entity.NotificationLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationLogJpaRepository extends JpaRepository<NotificationLogEntity, NotificationLogEntity.NotificationLogPk> {
}

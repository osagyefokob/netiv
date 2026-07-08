package com.logistics.warehouseservice.application.service;

import com.logistics.warehouseservice.api.exception.BusinessException;
import com.logistics.warehouseservice.application.dto.request.CreateLocationRequest;
import com.logistics.warehouseservice.application.dto.response.LocationResponse;
import com.logistics.warehouseservice.infrastructure.persistence.entity.StorageLocationEntity;
import com.logistics.common.security.LogisticsTenantContext;
import com.logistics.warehouseservice.infrastructure.persistence.repository.StorageLocationJpaRepository;
import com.logistics.warehouseservice.infrastructure.persistence.repository.WarehouseJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class LocationService {

    private final StorageLocationJpaRepository locationRepository;
    private final WarehouseJpaRepository warehouseRepository;

    private static UUID normalizeToUuid(String input) {
        if (input == null || input.isBlank()) return null;
        String digits = input.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) return null;
        if (digits.length() >= 32) {
            digits = digits.substring(0, 32);
        } else {
            digits = digits + "0".repeat(32 - digits.length());
        }
        return UUID.fromString(
            digits.substring(0, 8) + "-" +
            digits.substring(8, 12) + "-" +
            digits.substring(12, 16) + "-" +
            digits.substring(16, 20) + "-" +
            digits.substring(20, 32)
        );
    }

    @Transactional
    public LocationResponse addLocation(UUID warehouseId, CreateLocationRequest request) {
        warehouseRepository.findByWarehouseIdAndCompanyId(warehouseId, LogisticsTenantContext.getCompanyId())
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Warehouse not found"));
        StorageLocationEntity entity = new StorageLocationEntity();
        if (request.locationId() != null && !request.locationId().isBlank()) {
            UUID customId = normalizeToUuid(request.locationId());
            if (customId != null) {
                if (locationRepository.existsById(customId)) {
                    throw new BusinessException("CONFLICT", "Location ID already exists");
                }
                entity.setLocationId(customId);
            }
        }
        entity.setWarehouseId(warehouseId);
        entity.setZone(request.zone());
        entity.setAisle(request.aisle());
        entity.setShelf(request.shelf());
        entity.setBin(request.bin());
        entity.setLocationType(request.locationType());
        entity.setMaxCapacity(request.maxCapacity());
        entity.setActive(true);
        StorageLocationEntity saved = locationRepository.save(entity);
        log.info("Location added: id={}, warehouse={}", saved.getLocationId(), warehouseId);
        return LocationResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<LocationResponse> getLocations(UUID warehouseId) {
        warehouseRepository.findByWarehouseIdAndCompanyId(warehouseId, LogisticsTenantContext.getCompanyId())
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Warehouse not found"));
        return locationRepository.findAllByWarehouseIdAndIsActiveTrue(warehouseId).stream()
            .map(LocationResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public LocationResponse getLocation(UUID locationId) {
        StorageLocationEntity entity = locationRepository.findById(locationId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Location not found"));
        warehouseRepository.findByWarehouseIdAndCompanyId(entity.getWarehouseId(), LogisticsTenantContext.getCompanyId())
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Location not found"));
        return LocationResponse.from(entity);
    }
}

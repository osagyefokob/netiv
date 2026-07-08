package com.logistics.warehouseservice.application.service;

import com.logistics.warehouseservice.application.dto.response.StockMovementResponse;
import com.logistics.warehouseservice.infrastructure.persistence.repository.StockMovementJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MovementQueryService {

    private final StockMovementJpaRepository movementRepository;

    @Transactional(readOnly = true)
    public Page<StockMovementResponse> listMovements(int page, int limit) {
        return movementRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page - 1, limit))
            .map(StockMovementResponse::from);
    }
}

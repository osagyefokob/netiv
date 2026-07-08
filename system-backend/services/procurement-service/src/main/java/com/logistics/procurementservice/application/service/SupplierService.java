package com.logistics.procurementservice.application.service;

import com.logistics.procurementservice.api.exception.BusinessException;
import com.logistics.procurementservice.application.dto.request.CreateSupplierRequest;
import com.logistics.procurementservice.application.dto.response.SupplierResponse;
import com.logistics.common.security.LogisticsTenantContext;
import com.logistics.procurementservice.infrastructure.persistence.entity.SupplierEntity;
import com.logistics.procurementservice.infrastructure.persistence.repository.SupplierJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierJpaRepository supplierRepository;

    @Transactional
    public SupplierResponse createSupplier(CreateSupplierRequest request) {
        SupplierEntity entity = new SupplierEntity();
        entity.setCompanyId(LogisticsTenantContext.getCompanyId());
        entity.setName(request.name());
        entity.setContactEmail(request.contactEmail());
        entity.setContactPhone(request.contactPhone());
        entity.setStreet(request.street());
        entity.setCity(request.city());
        entity.setCountry(request.country());
        entity.setLeadTimeDays(request.leadTimeDays() != null ? request.leadTimeDays() : 7);
        entity.setPaymentTerms(request.paymentTerms() != null ? request.paymentTerms() : "NET_30");
        entity.setRating(request.rating());
        entity.setActive(true);

        SupplierEntity saved = supplierRepository.save(entity);
        log.info("Supplier created: supplierId={}", saved.getSupplierId());
        return SupplierResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public SupplierResponse getSupplier(UUID supplierId) {
        UUID cid = LogisticsTenantContext.getCompanyId();
        return supplierRepository.findBySupplierIdAndCompanyId(supplierId, cid)
            .map(SupplierResponse::from)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Supplier not found"));
    }

    @Transactional(readOnly = true)
    public Page<SupplierResponse> listSuppliers(Pageable pageable) {
        UUID cid = LogisticsTenantContext.getCompanyId();
        return supplierRepository.findAllByCompanyIdAndIsActiveTrue(cid, pageable).map(SupplierResponse::from);
    }
}

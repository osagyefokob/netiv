package com.logistics.useridentityservice.application.service;

import com.logistics.common.security.LogisticsSecurityUser;
import com.logistics.useridentityservice.api.exception.BusinessException;
import com.logistics.useridentityservice.application.dto.request.CreateCompanyRequest;
import com.logistics.useridentityservice.application.dto.response.CompanyResponse;
import com.logistics.useridentityservice.infrastructure.persistence.entity.CompanyEntity;
import com.logistics.useridentityservice.infrastructure.persistence.repository.CompanyJpaRepository;
import com.logistics.useridentityservice.infrastructure.security.IdentitySecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CompanyManagementService {

    private final CompanyJpaRepository companyRepository;

    @Transactional(readOnly = true)
    public List<CompanyResponse> listCompanies() {
        return companyRepository.findAll().stream()
            .map(CompanyResponse::from)
            .collect(Collectors.toList());
    }

    @Transactional
    public CompanyResponse createCompany(CreateCompanyRequest request) {
        String name = request.name().trim();
        if (companyRepository.existsByNameIgnoreCase(name)) {
            throw new BusinessException("CONFLICT", "A company with this name already exists");
        }
        CompanyEntity e = new CompanyEntity();
        e.setName(name);
        if (request.code() != null && !request.code().isBlank()) {
            e.setCode(request.code().trim().toUpperCase(Locale.ROOT));
        } else {
            e.setCode(slugCode(name));
        }
        e.setActive(true);
        return CompanyResponse.from(companyRepository.save(e));
    }

    @Transactional(readOnly = true)
    public CompanyResponse getCompany(UUID companyId) {
        LogisticsSecurityUser actor = IdentitySecurityUtils.requireUser();
        if ("COMPANY_ADMIN".equals(actor.getRoleName())) {
            if (actor.getCompanyId() == null || !actor.getCompanyId().equals(companyId)) {
                throw new BusinessException("FORBIDDEN", "Cannot access this company");
            }
        }
        return companyRepository.findById(companyId)
            .map(CompanyResponse::from)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Company not found"));
    }

    private static String slugCode(String name) {
        String s = name.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "_");
        if (s.length() > 60) {
            s = s.substring(0, 60);
        }
        return s.isEmpty() ? "COMPANY" : s;
    }
}

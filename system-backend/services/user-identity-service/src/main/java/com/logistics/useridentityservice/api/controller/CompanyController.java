package com.logistics.useridentityservice.api.controller;

import com.logistics.useridentityservice.application.dto.request.CreateCompanyRequest;
import com.logistics.useridentityservice.application.dto.response.CompanyResponse;
import com.logistics.useridentityservice.application.service.CompanyManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/identity/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyManagementService companyManagementService;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<CompanyResponse>> listCompanies() {
        return ResponseEntity.ok(companyManagementService.listCompanies());
    }

    @GetMapping("/{companyId}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('COMPANY_ADMIN')")
    public ResponseEntity<CompanyResponse> getCompany(@PathVariable UUID companyId) {
        return ResponseEntity.ok(companyManagementService.getCompany(companyId));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<CompanyResponse> createCompany(@Valid @RequestBody CreateCompanyRequest request) {
        CompanyResponse response = companyManagementService.createCompany(request);
        return ResponseEntity.created(URI.create("/api/v1/identity/companies/" + response.companyId())).body(response);
    }
}

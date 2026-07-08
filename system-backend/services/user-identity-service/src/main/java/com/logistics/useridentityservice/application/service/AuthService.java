package com.logistics.useridentityservice.application.service;

import com.logistics.useridentityservice.api.exception.BusinessException;
import com.logistics.useridentityservice.application.dto.request.LoginRequest;
import com.logistics.useridentityservice.application.dto.request.RegisterRequest;
import com.logistics.useridentityservice.application.dto.request.ResetPasswordRequest;
import com.logistics.useridentityservice.application.dto.response.LoginResponse;
import com.logistics.useridentityservice.infrastructure.messaging.IdentityUserCreatedEventPublisher;
import com.logistics.useridentityservice.infrastructure.persistence.entity.CompanyEntity;
import com.logistics.useridentityservice.infrastructure.persistence.entity.RoleEntity;
import com.logistics.useridentityservice.infrastructure.persistence.entity.UserEntity;
import com.logistics.useridentityservice.infrastructure.persistence.repository.CompanyJpaRepository;
import com.logistics.useridentityservice.infrastructure.persistence.repository.RoleJpaRepository;
import com.logistics.useridentityservice.infrastructure.persistence.repository.UserJpaRepository;
import com.logistics.useridentityservice.infrastructure.security.PasetoTokenService;
import com.logistics.useridentityservice.infrastructure.security.TokenClaims;
import dev.paseto.jpaseto.Paseto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserJpaRepository userRepository;
    private final RoleJpaRepository roleRepository;
    private final CompanyJpaRepository companyRepository;
    private final PasetoTokenService tokenService;
    private final BCryptPasswordEncoder passwordEncoder;
    private final IdentityUserCreatedEventPublisher identityUserCreatedEventPublisher;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        UserEntity user = userRepository.findByEmail(request.email().toLowerCase())
            .orElseThrow(() -> new BusinessException("INVALID_CREDENTIALS", "Email or password is incorrect"));

        if (!user.isActive()) {
            throw new BusinessException("ACCOUNT_DEACTIVATED", "This account has been deactivated");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BusinessException("INVALID_CREDENTIALS", "Email or password is incorrect");
        }

        return buildLoginResponse(user);
    }

    @Transactional
    public LoginResponse register(RegisterRequest request) {
        String email = request.email().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new BusinessException("CONFLICT", "An account with this email already exists");
        }

        RoleEntity viewer = roleRepository.findByName("VIEWER")
            .orElseThrow(() -> new BusinessException("INTERNAL_ERROR", "VIEWER role not configured"));

        CompanyEntity company = resolveOrCreateCompany(request.companyName().trim());

        UserEntity entity = new UserEntity();
        entity.setEmail(email);
        entity.setPasswordHash(passwordEncoder.encode(request.password()));
        entity.setFirstName(request.firstName().trim());
        entity.setLastName(request.lastName().trim());
        entity.setCompany(company);
        entity.setCountry(request.country().trim());
        entity.setRole(viewer);
        entity.setWarehouseId(null);
        entity.setActive(true);

        UserEntity saved = userRepository.save(entity);
        identityUserCreatedEventPublisher.publish(saved);
        log.info("User registered: userId={}, email={}", saved.getUserId(), saved.getEmail());

        return buildLoginResponse(saved);
    }

    private CompanyEntity resolveOrCreateCompany(String rawName) {
        String normalized = rawName.trim();
        if (normalized.isEmpty()) {
            throw new BusinessException("VALIDATION_ERROR", "Company name is required");
        }
        return companyRepository.findByNameIgnoreCase(normalized)
            .orElseGet(() -> {
                CompanyEntity c = new CompanyEntity();
                c.setName(normalized);
                c.setCode(slugCode(normalized));
                c.setActive(true);
                return companyRepository.save(c);
            });
    }

    private static String slugCode(String name) {
        String s = name.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "_");
        if (s.length() > 60) {
            s = s.substring(0, 60);
        }
        return s.isEmpty() ? "COMPANY" : s;
    }

    private LoginResponse buildLoginResponse(UserEntity user) {
        List<String> permissions = user.getRole().getPermissions().stream()
            .map(p -> p.getResource() + ":" + p.getAction())
            .collect(Collectors.toList());

        UUID companyId = user.getCompany() != null ? user.getCompany().getCompanyId() : null;

        TokenClaims claims = new TokenClaims(
            user.getUserId(),
            user.getEmail(),
            user.getRole().getRoleId(),
            user.getRole().getName(),
            permissions,
            user.getWarehouseId(),
            companyId
        );

        String accessToken = tokenService.issueAccessToken(claims);
        String refreshToken = tokenService.issueRefreshToken(user.getUserId().toString());

        user.setLastLogin(java.time.Instant.now());
        userRepository.save(user);

        log.info("User logged in: userId={}, role={}", user.getUserId(), user.getRole().getName());

        return new LoginResponse(
            accessToken,
            refreshToken,
            3600L,
            new LoginResponse.UserInfo(
                user.getUserId(),
                user.getEmail(),
                user.getRole().getName(),
                user.getWarehouseId(),
                companyId
            )
        );
    }

    @Transactional
    public void logout(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return;
        }
        String compact = authHeader.substring(7).trim();
        if (compact.isEmpty()) {
            return;
        }
        Paseto paseto = tokenService.verify(compact);
        String jti = paseto.getClaims().getTokenId();
        if (jti != null) {
            tokenService.revokeToken(jti);
        }
        log.info("User logged out: jti={}", jti);
    }

    /**
     * Self-service password reset (no email token). Intended for development / internal deployments;
     * production systems should add email verification or MFA.
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        userRepository.findByEmail(request.email().toLowerCase()).ifPresent(user -> {
            if (!user.isActive()) {
                log.warn("Password reset ignored for deactivated account: {}", request.email());
                return;
            }
            user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
            userRepository.save(user);
            log.info("Password reset for userId={}", user.getUserId());
        });
    }
}

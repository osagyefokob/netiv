package com.logistics.useridentityservice.application.service;

import com.logistics.common.security.LogisticsSecurityUser;
import com.logistics.useridentityservice.api.exception.BusinessException;
import com.logistics.useridentityservice.application.dto.request.CreateUserRequest;
import com.logistics.useridentityservice.application.dto.request.UpdateUserRoleRequest;
import com.logistics.useridentityservice.application.dto.response.UserResponse;
import com.logistics.useridentityservice.infrastructure.persistence.entity.CompanyEntity;
import com.logistics.useridentityservice.infrastructure.persistence.entity.RoleEntity;
import com.logistics.useridentityservice.infrastructure.persistence.entity.UserEntity;
import com.logistics.useridentityservice.infrastructure.persistence.repository.CompanyJpaRepository;
import com.logistics.useridentityservice.infrastructure.persistence.repository.RoleJpaRepository;
import com.logistics.useridentityservice.infrastructure.persistence.repository.UserJpaRepository;
import com.logistics.useridentityservice.infrastructure.security.IdentitySecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserManagementService {

    private final UserJpaRepository userRepository;
    private final RoleJpaRepository roleRepository;
    private final CompanyJpaRepository companyRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        LogisticsSecurityUser actor = IdentitySecurityUtils.requireUser();
        if (userRepository.existsByEmail(request.email().toLowerCase())) {
            throw new BusinessException("CONFLICT", "A user with this email already exists");
        }

        RoleEntity role = roleRepository.findById(request.roleId())
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Role not found"));

        if ("SUPER_ADMIN".equals(role.getName()) && !"SUPER_ADMIN".equals(actor.getRoleName())) {
            throw new BusinessException("FORBIDDEN", "Only a platform admin can assign this role");
        }

        UUID targetCompanyId = resolveTargetCompanyId(actor, request.companyId(), role.getName());

        if ("COMPANY_ADMIN".equals(role.getName()) && targetCompanyId != null) {
            if (userRepository.existsByCompanyCompanyIdAndRole_NameAndIsActiveTrue(targetCompanyId, "COMPANY_ADMIN")) {
                throw new BusinessException("CONFLICT", "This company already has an active company admin");
            }
        }

        if ("WAREHOUSE_STAFF".equals(role.getName()) && request.warehouseId() == null) {
            throw new BusinessException("VALIDATION_ERROR", "WAREHOUSE_STAFF must have a warehouse assigned");
        }

        UserEntity entity = new UserEntity();
        entity.setEmail(request.email().toLowerCase());
        entity.setPasswordHash(passwordEncoder.encode(request.temporaryPassword()));
        entity.setFirstName(request.firstName());
        entity.setLastName(request.lastName());
        entity.setRole(role);
        entity.setWarehouseId(request.warehouseId());
        entity.setActive(true);

        if ("SUPER_ADMIN".equals(role.getName())) {
            entity.setCompany(null);
        } else if (targetCompanyId != null) {
            CompanyEntity company = companyRepository.findById(targetCompanyId)
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Company not found"));
            entity.setCompany(company);
        } else {
            throw new BusinessException("VALIDATION_ERROR", "Company is required for this role");
        }

        UserEntity saved = userRepository.save(entity);
        log.info("User created: userId={}, role={}", saved.getUserId(), role.getName());

        return UserResponse.from(saved);
    }

    private UUID resolveTargetCompanyId(LogisticsSecurityUser actor, UUID requestCompanyId, String newRoleName) {
        if ("SUPER_ADMIN".equals(newRoleName)) {
            return null;
        }
        if ("COMPANY_ADMIN".equals(actor.getRoleName())) {
            UUID cid = actor.getCompanyId();
            if (cid == null) {
                throw new BusinessException("FORBIDDEN", "Company admin must be bound to a company");
            }
            return cid;
        }
        if ("SUPER_ADMIN".equals(actor.getRoleName())) {
            if (requestCompanyId == null) {
                throw new BusinessException("VALIDATION_ERROR", "companyId is required");
            }
            return requestCompanyId;
        }
        throw new BusinessException("FORBIDDEN", "Not allowed to create users");
    }

    @Transactional
    public void deactivateUser(UUID userId) {
        LogisticsSecurityUser actor = IdentitySecurityUtils.requireUser();
        UserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "User not found"));

        assertCanManageUser(actor, user);

        if ("SUPER_ADMIN".equals(user.getRole().getName())) {
            throw new BusinessException("FORBIDDEN", "Cannot deactivate a platform admin account");
        }

        user.setActive(false);
        userRepository.save(user);
        log.info("User deactivated: userId={}", userId);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID userId) {
        LogisticsSecurityUser actor = IdentitySecurityUtils.requireUser();
        UserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "User not found"));

        if (actor.getUserId().equals(userId)) {
            return UserResponse.from(user);
        }
        assertCanManageUser(actor, user);
        return UserResponse.from(user);
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> listUsers(Pageable pageable, UUID companyIdFilter) {
        LogisticsSecurityUser actor = IdentitySecurityUtils.requireUser();
        if ("SUPER_ADMIN".equals(actor.getRoleName())) {
            if (companyIdFilter != null) {
                return userRepository.findAllByIsActiveTrueAndCompanyCompanyId(companyIdFilter, pageable)
                    .map(UserResponse::from);
            }
            return userRepository.findAllByIsActiveTrue(pageable).map(UserResponse::from);
        }
        if ("COMPANY_ADMIN".equals(actor.getRoleName())) {
            UUID cid = actor.getCompanyId();
            if (cid == null) {
                throw new BusinessException("FORBIDDEN", "Company admin must be bound to a company");
            }
            return userRepository.findAllByIsActiveTrueAndCompanyCompanyId(cid, pageable).map(UserResponse::from);
        }
        throw new BusinessException("FORBIDDEN", "Not allowed to list users");
    }

    @Transactional
    public UserResponse updateUserRole(UUID userId, UpdateUserRoleRequest request) {
        LogisticsSecurityUser actor = IdentitySecurityUtils.requireUser();
        UserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "User not found"));
        assertCanManageUser(actor, user);

        RoleEntity newRole = roleRepository.findById(request.roleId())
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Role not found"));

        if ("SUPER_ADMIN".equals(newRole.getName()) && !"SUPER_ADMIN".equals(actor.getRoleName())) {
            throw new BusinessException("FORBIDDEN", "Only a platform admin can assign this role");
        }

        if ("SUPER_ADMIN".equals(newRole.getName())) {
            user.setCompany(null);
        } else if ("WAREHOUSE_STAFF".equals(newRole.getName()) && request.warehouseId() == null) {
            throw new BusinessException("VALIDATION_ERROR", "WAREHOUSE_STAFF must have a warehouse assigned");
        }

        if ("COMPANY_ADMIN".equals(newRole.getName())) {
            UUID companyId = user.getCompany() != null ? user.getCompany().getCompanyId() : null;
            if (companyId == null) {
                throw new BusinessException("VALIDATION_ERROR", "User must belong to a company to be company admin");
            }
            long otherAdmins = userRepository.countByCompanyCompanyIdAndRole_NameAndIsActiveTrueAndUserIdNot(
                companyId, "COMPANY_ADMIN", userId);
            if (otherAdmins > 0) {
                throw new BusinessException("CONFLICT", "This company already has an active company admin");
            }
        }

        user.setRole(newRole);
        if (request.warehouseId() != null) {
            user.setWarehouseId(request.warehouseId());
        }
        if (!"WAREHOUSE_STAFF".equals(newRole.getName())) {
            user.setWarehouseId(null);
        }

        UserEntity saved = userRepository.save(user);
        log.info("User role updated: userId={}, role={}", userId, newRole.getName());
        return UserResponse.from(saved);
    }

    private void assertCanManageUser(LogisticsSecurityUser actor, UserEntity target) {
        if ("SUPER_ADMIN".equals(actor.getRoleName())) {
            return;
        }
        if ("COMPANY_ADMIN".equals(actor.getRoleName())) {
            if ("SUPER_ADMIN".equals(target.getRole().getName())) {
                throw new BusinessException("FORBIDDEN", "Cannot manage platform admin users");
            }
            UUID ac = actor.getCompanyId();
            UUID tc = target.getCompany() != null ? target.getCompany().getCompanyId() : null;
            if (ac == null || tc == null || !ac.equals(tc)) {
                throw new BusinessException("FORBIDDEN", "Can only manage users in your company");
            }
            return;
        }
        throw new BusinessException("FORBIDDEN", "Not allowed to manage users");
    }

    @Transactional
    public UserResponse updateOwnProfile(UUID userId, String firstName, String lastName) {
        LogisticsSecurityUser actor = IdentitySecurityUtils.requireUser();
        if (!actor.getUserId().equals(userId)) {
            throw new BusinessException("FORBIDDEN", "You can only update your own profile");
        }
        UserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "User not found"));
        user.setFirstName(firstName);
        user.setLastName(lastName);
        UserEntity saved = userRepository.save(user);
        log.info("User profile updated: userId={}", userId);
        return UserResponse.from(saved);
    }

    @Transactional
    public void changePassword(UUID userId, String currentPassword, String newPassword) {
        LogisticsSecurityUser actor = IdentitySecurityUtils.requireUser();
        if (!actor.getUserId().equals(userId)) {
            throw new BusinessException("FORBIDDEN", "You can only change your own password");
        }
        UserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "User not found"));
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new BusinessException("VALIDATION_ERROR", "Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("Password changed: userId={}", userId);
    }
}

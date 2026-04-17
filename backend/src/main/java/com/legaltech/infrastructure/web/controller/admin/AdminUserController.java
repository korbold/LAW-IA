package com.legaltech.infrastructure.web.controller.admin;

import com.legaltech.application.usecase.admin.AuditService;
import com.legaltech.domain.model.UserRole;
import com.legaltech.domain.model.UserStatus;
import com.legaltech.infrastructure.persistence.entity.UserEntity;
import com.legaltech.infrastructure.persistence.repository.JpaChatMessageRepository;
import com.legaltech.infrastructure.persistence.repository.JpaChatSessionRepository;
import com.legaltech.infrastructure.persistence.repository.JpaUserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminUserController {

    private final JpaUserRepository userRepository;
    private final JpaChatSessionRepository sessionRepository;
    private final JpaChatMessageRepository messageRepository;
    private final AuditService auditService;

    public AdminUserController(JpaUserRepository userRepository,
                                JpaChatSessionRepository sessionRepository,
                                JpaChatMessageRepository messageRepository,
                                AuditService auditService) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
        this.auditService = auditService;
    }

    @GetMapping
    public Map<String, Object> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) UserStatus status) {

        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<UserEntity> result = userRepository.findFiltered(search, role, status, pageable);

        var users = result.getContent().stream().map(this::toUserResponse).toList();

        return Map.of(
                "content", users,
                "totalElements", result.getTotalElements(),
                "totalPages", result.getTotalPages(),
                "page", result.getNumber(),
                "size", result.getSize()
        );
    }

    @GetMapping("/{id}")
    public Map<String, Object> getUserById(@PathVariable String id) {
        var user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return toUserResponse(user);
    }

    @PutMapping("/{id}/role")
    public Map<String, Object> updateRole(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal Jwt admin) {
        var user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var oldRole = user.getRole();
        var newRole = UserRole.valueOf(body.get("role"));
        user.setRole(newRole);
        userRepository.save(user);

        auditService.log(admin, "USER_ROLE_CHANGED", "User", id,
                "Role changed from " + oldRole + " to " + newRole);

        return toUserResponse(user);
    }

    @PutMapping("/{id}/status")
    public Map<String, Object> updateStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal Jwt admin) {
        var user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var oldStatus = user.getStatus();
        var newStatus = UserStatus.valueOf(body.get("status"));
        user.setStatus(newStatus);
        userRepository.save(user);

        auditService.log(admin, "USER_STATUS_CHANGED", "User", id,
                "Status changed from " + oldStatus + " to " + newStatus);

        return toUserResponse(user);
    }

    private Map<String, Object> toUserResponse(UserEntity user) {
        return Map.ofEntries(
                Map.entry("id", user.getId()),
                Map.entry("email", user.getEmail()),
                Map.entry("displayName", user.getDisplayName() != null ? user.getDisplayName() : ""),
                Map.entry("avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : ""),
                Map.entry("role", user.getRole().name()),
                Map.entry("status", user.getStatus().name()),
                Map.entry("createdAt", user.getCreatedAt().toString()),
                Map.entry("lastLoginAt", user.getLastLoginAt() != null ? user.getLastLoginAt().toString() : ""),
                Map.entry("sessionCount", sessionRepository.countByUserId(user.getId())),
                Map.entry("messageCount", messageRepository.countByUserId(user.getId()))
        );
    }
}

package com.legaltech.infrastructure.web.controller.admin;

import com.legaltech.infrastructure.persistence.entity.AuditLogEntity;
import com.legaltech.infrastructure.persistence.repository.JpaAuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
public class AdminAuditController {

    private final JpaAuditLogRepository auditLogRepository;

    public AdminAuditController(JpaAuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public Map<String, Object> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {

        var pageable = PageRequest.of(page, size);
        Instant from = dateFrom != null ? Instant.parse(dateFrom + "T00:00:00Z") : null;
        Instant to = dateTo != null ? Instant.parse(dateTo + "T23:59:59Z") : null;

        Page<AuditLogEntity> result = auditLogRepository.findFiltered(action, from, to, pageable);

        var logs = result.getContent().stream().map(log -> Map.<String, Object>of(
                "id", log.getId(),
                "adminId", log.getAdminId(),
                "adminEmail", log.getAdminEmail(),
                "action", log.getAction(),
                "entityType", log.getEntityType(),
                "entityId", log.getEntityId() != null ? log.getEntityId() : "",
                "details", log.getDetails() != null ? log.getDetails() : "",
                "createdAt", log.getCreatedAt().toString()
        )).toList();

        return Map.of(
                "content", logs,
                "totalElements", result.getTotalElements(),
                "totalPages", result.getTotalPages(),
                "page", result.getNumber(),
                "size", result.getSize()
        );
    }
}

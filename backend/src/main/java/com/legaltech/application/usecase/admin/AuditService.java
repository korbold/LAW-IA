package com.legaltech.application.usecase.admin;

import com.legaltech.infrastructure.persistence.entity.AuditLogEntity;
import com.legaltech.infrastructure.persistence.repository.JpaAuditLogRepository;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final JpaAuditLogRepository auditLogRepository;

    public AuditService(JpaAuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void log(Jwt admin, String action, String entityType, String entityId, String details) {
        var log = AuditLogEntity.builder()
                .adminId(admin.getSubject())
                .adminEmail(admin.getClaimAsString("email"))
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .build();
        auditLogRepository.save(log);
    }
}

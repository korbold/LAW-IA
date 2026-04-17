package com.legaltech.infrastructure.persistence.repository;

import com.legaltech.infrastructure.persistence.entity.AuditLogEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;

public interface JpaAuditLogRepository extends JpaRepository<AuditLogEntity, String> {

    @Query("SELECT a FROM AuditLogEntity a WHERE " +
            "(:action IS NULL OR a.action = :action) " +
            "AND (:dateFrom IS NULL OR a.createdAt >= :dateFrom) " +
            "AND (:dateTo IS NULL OR a.createdAt <= :dateTo) " +
            "ORDER BY a.createdAt DESC")
    Page<AuditLogEntity> findFiltered(
            @Param("action") String action,
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            Pageable pageable);
}

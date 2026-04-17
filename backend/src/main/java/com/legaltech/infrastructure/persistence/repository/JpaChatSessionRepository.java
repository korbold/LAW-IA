package com.legaltech.infrastructure.persistence.repository;

import com.legaltech.infrastructure.persistence.entity.ChatSessionEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;

public interface JpaChatSessionRepository extends JpaRepository<ChatSessionEntity, String> {

    @Query("SELECT s FROM ChatSessionEntity s WHERE " +
            "(:userId IS NULL OR s.userId = :userId) " +
            "AND (:dateFrom IS NULL OR s.createdAt >= :dateFrom) " +
            "AND (:dateTo IS NULL OR s.createdAt <= :dateTo)")
    Page<ChatSessionEntity> findFiltered(
            @Param("userId") String userId,
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            Pageable pageable);

    long countByUserId(String userId);

    long countByCreatedAtAfter(Instant after);

    Page<ChatSessionEntity> findByUserId(String userId, Pageable pageable);
}

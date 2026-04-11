package com.legaltech.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "scraping_jobs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScrapingJobEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private String id;

    @Column(name = "source_id")
    private String sourceId;

    @Column(name = "job_type", nullable = false, length = 50)
    private String jobType;

    @Column(length = 50)
    private String section;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "documents_found", nullable = false)
    @Builder.Default
    private Integer documentsFound = 0;

    @Column(name = "documents_downloaded", nullable = false)
    @Builder.Default
    private Integer documentsDownloaded = 0;

    @Column(name = "documents_processed", nullable = false)
    @Builder.Default
    private Integer documentsProcessed = 0;

    @Column(name = "documents_failed", nullable = false)
    @Builder.Default
    private Integer documentsFailed = 0;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private Integer retryCount = 0;

    @Column(name = "max_retries", nullable = false)
    @Builder.Default
    private Integer maxRetries = 3;

    @Column(name = "next_retry_at")
    private Instant nextRetryAt;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}

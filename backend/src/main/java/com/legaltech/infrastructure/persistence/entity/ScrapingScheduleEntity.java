package com.legaltech.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "scraping_schedule")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScrapingScheduleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private String id;

    @Column(nullable = false, length = 50, unique = true)
    private String section;

    @Column(name = "cron_expression", nullable = false, length = 50)
    @Builder.Default
    private String cronExpression = "0 0 6 * * *";

    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    @Column(name = "last_execution_at")
    private Instant lastExecutionAt;

    @Column(name = "last_status", length = 20)
    private String lastStatus;

    @Column(name = "next_execution_at")
    private Instant nextExecutionAt;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}

package com.legaltech.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "system_prompts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemPromptEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false)
    private String updatedBy;

    @Column(nullable = false)
    private String updatedByEmail;

    @Column(nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private boolean active = true;
}

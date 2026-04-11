package com.legaltech.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "legal_documents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LegalDocumentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private String id;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(name = "file_name", nullable = false, length = 500)
    private String fileName;

    @Column(name = "file_type", nullable = false, length = 50)
    private String fileType;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "total_chunks")
    @Builder.Default
    private Integer totalChunks = 0;

    @Column(name = "uploaded_by", nullable = false)
    private String uploadedBy;

    @Column(name = "uploaded_by_email", nullable = false)
    private String uploadedByEmail;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Column(name = "document_type", length = 50)
    private String documentType;

    @Column(length = 20)
    private String abbreviation;

    @Column(name = "edition_number", length = 50)
    private String editionNumber;

    @Column(name = "publication_date")
    private LocalDate publicationDate;

    @Column(name = "source_id")
    private String sourceId;

    @Column(name = "source_url", length = 1000)
    private String sourceUrl;

    @Column(length = 100)
    private String version;

    private Integer priority;

    @Column(name = "page_count")
    private Integer pageCount;
}

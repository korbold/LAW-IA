package com.legaltech.application.usecase.admin;

import com.legaltech.infrastructure.persistence.entity.LegalDocumentEntity;
import com.legaltech.infrastructure.persistence.entity.ScrapingJobEntity;
import com.legaltech.infrastructure.persistence.repository.JpaLegalDocumentRepository;
import com.legaltech.infrastructure.persistence.repository.JpaScrapingJobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.Executors;

@Service
public class InitialLoadService {

    private static final Logger log = LoggerFactory.getLogger(InitialLoadService.class);

    private final BatchDocumentProcessingService batchService;
    private final JpaLegalDocumentRepository documentRepository;
    private final JpaScrapingJobRepository jobRepository;

    public InitialLoadService(BatchDocumentProcessingService batchService,
                               JpaLegalDocumentRepository documentRepository,
                               JpaScrapingJobRepository jobRepository) {
        this.batchService = batchService;
        this.documentRepository = documentRepository;
        this.jobRepository = jobRepository;
    }

    public ScrapingJobEntity startInitialLoad() {
        // Check for running INITIAL_LOAD jobs
        List<ScrapingJobEntity> running = jobRepository.findByJobTypeAndStatusIn(
                "INITIAL_LOAD", List.of("PENDING", "PROCESSING"));
        if (!running.isEmpty()) {
            throw new IllegalStateException("An initial load job is already running: " + running.get(0).getId());
        }

        ScrapingJobEntity job = ScrapingJobEntity.builder()
                .jobType("INITIAL_LOAD")
                .status("PENDING")
                .build();
        jobRepository.save(job);

        List<LegalCatalogConfig.LegalCode> codes = LegalCatalogConfig.CATALOG;

        Executors.newVirtualThreadPerTaskExecutor().submit(() -> executeLoad(job, codes));

        return job;
    }

    public ScrapingJobEntity startInitialLoadByPriority(int priority) {
        List<ScrapingJobEntity> running = jobRepository.findByJobTypeAndStatusIn(
                "INITIAL_LOAD", List.of("PENDING", "PROCESSING"));
        if (!running.isEmpty()) {
            throw new IllegalStateException("An initial load job is already running: " + running.get(0).getId());
        }

        List<LegalCatalogConfig.LegalCode> codes = LegalCatalogConfig.CATALOG.stream()
                .filter(c -> c.priority() == priority)
                .toList();

        if (codes.isEmpty()) {
            throw new IllegalArgumentException("No codes found for priority " + priority);
        }

        ScrapingJobEntity job = ScrapingJobEntity.builder()
                .jobType("INITIAL_LOAD")
                .section("PRIORITY_" + priority)
                .status("PENDING")
                .build();
        jobRepository.save(job);

        Executors.newVirtualThreadPerTaskExecutor().submit(() -> executeLoad(job, codes));

        return job;
    }

    public void executeLoad(ScrapingJobEntity job, List<LegalCatalogConfig.LegalCode> codes) {
        try {
            job.setStatus("PROCESSING");
            job.setStartedAt(Instant.now());
            job.setDocumentsFound(codes.size());
            jobRepository.save(job);

            List<LegalDocumentEntity> newDocs = new ArrayList<>();
            List<byte[]> contents = new ArrayList<>();

            for (LegalCatalogConfig.LegalCode code : codes) {
                // Skip already loaded
                if (documentRepository.findByAbbreviation(code.abbreviation()).isPresent()) {
                    log.info("Skipping already loaded code: {} ({})", code.abbreviation(), code.name());
                    continue;
                }

                try {
                    log.info("Downloading {} ({}) from {}", code.abbreviation(), code.name(), code.sourceUrl());
                    byte[] content = batchService.downloadPdfWithRetry(code.sourceUrl());
                    job.setDocumentsDownloaded(job.getDocumentsDownloaded() + 1);
                    jobRepository.save(job);

                    LegalDocumentEntity doc = LegalDocumentEntity.builder()
                            .title(code.name())
                            .fileName(code.abbreviation() + ".pdf")
                            .fileType("pdf")
                            .fileSize((long) content.length)
                            .status("PENDING")
                            .uploadedBy("SYSTEM")
                            .uploadedByEmail("initial-load@legaltech.ec")
                            .documentType("LEGAL_CODE")
                            .abbreviation(code.abbreviation())
                            .sourceUrl(code.sourceUrl())
                            .priority(code.priority())
                            .build();
                    documentRepository.save(doc);

                    newDocs.add(doc);
                    contents.add(content);

                } catch (Exception e) {
                    log.error("Failed to download {}: {}", code.abbreviation(), e.getMessage());
                    job.setDocumentsFailed(job.getDocumentsFailed() + 1);
                    jobRepository.save(job);
                }
            }

            if (!newDocs.isEmpty()) {
                batchService.processBatchAsync(newDocs, contents, job);
            } else {
                job.setStatus("COMPLETED");
                job.setCompletedAt(Instant.now());
                jobRepository.save(job);
                log.info("Initial load completed - no new documents to process");
            }

        } catch (Exception e) {
            log.error("Initial load failed: {}", e.getMessage(), e);
            job.setStatus("FAILED");
            job.setErrorMessage(e.getMessage());
            job.setCompletedAt(Instant.now());
            jobRepository.save(job);
        }
    }

    public List<Map<String, Object>> getCatalogStatus() {
        List<Map<String, Object>> result = new ArrayList<>();

        for (LegalCatalogConfig.LegalCode code : LegalCatalogConfig.CATALOG) {
            var existing = documentRepository.findByAbbreviation(code.abbreviation());

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("abbreviation", code.abbreviation());
            entry.put("name", code.name());
            entry.put("priority", code.priority());
            entry.put("loaded", existing.isPresent());
            entry.put("documentId", existing.map(LegalDocumentEntity::getId).orElse(null));
            entry.put("status", existing.map(LegalDocumentEntity::getStatus).orElse(null));
            entry.put("totalChunks", existing.map(LegalDocumentEntity::getTotalChunks).orElse(null));
            entry.put("loadedAt", existing.map(d -> d.getCreatedAt().toString()).orElse(null));

            result.add(entry);
        }

        return result;
    }
}

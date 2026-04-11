package com.legaltech.application.usecase.admin;

import com.legaltech.infrastructure.persistence.entity.LegalDocumentEntity;
import com.legaltech.infrastructure.persistence.entity.ScrapingJobEntity;
import com.legaltech.infrastructure.persistence.repository.JpaLegalDocumentRepository;
import com.legaltech.infrastructure.persistence.repository.JpaScrapingJobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;

@Service
public class BatchDocumentProcessingService {

    private static final Logger log = LoggerFactory.getLogger(BatchDocumentProcessingService.class);
    private static final Semaphore downloadSemaphore = new Semaphore(3);

    private final DocumentProcessingService documentProcessingService;
    private final JpaLegalDocumentRepository documentRepository;
    private final JpaScrapingJobRepository jobRepository;
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    public BatchDocumentProcessingService(DocumentProcessingService documentProcessingService,
                                           JpaLegalDocumentRepository documentRepository,
                                           JpaScrapingJobRepository jobRepository) {
        this.documentProcessingService = documentProcessingService;
        this.documentRepository = documentRepository;
        this.jobRepository = jobRepository;
    }

    public byte[] downloadPdf(String url) throws IOException, InterruptedException {
        downloadSemaphore.acquire();
        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(30))
                    .followRedirects(HttpClient.Redirect.NORMAL)
                    .build();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(30))
                    .header("User-Agent", "Mozilla/5.0 (compatible; LegalTechBot/1.0)")
                    .GET()
                    .build();

            HttpResponse<byte[]> response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());

            if (response.statusCode() != 200) {
                throw new IOException("HTTP " + response.statusCode() + " downloading " + url);
            }

            return response.body();
        } finally {
            downloadSemaphore.release();
        }
    }

    public byte[] downloadPdfWithRetry(String url) throws IOException, InterruptedException {
        int maxRetries = 3;
        long[] backoffMs = {2_000, 8_000, 32_000};

        for (int attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return downloadPdf(url);
            } catch (IOException e) {
                if (attempt == maxRetries - 1) {
                    throw e;
                }
                log.warn("Download attempt {} failed for {}: {}. Retrying in {}ms",
                        attempt + 1, url, e.getMessage(), backoffMs[attempt]);
                Thread.sleep(backoffMs[attempt]);
            }
        }
        throw new IOException("Failed to download after " + maxRetries + " retries: " + url);
    }

    public void processDocument(LegalDocumentEntity doc, byte[] content, ScrapingJobEntity job) {
        try {
            documentProcessingService.processAsync(doc.getId(), content);

            // Poll for completion
            int maxWaitSeconds = 600;
            int pollIntervalMs = 2_000;
            int elapsed = 0;

            while (elapsed < maxWaitSeconds * 1000) {
                Thread.sleep(pollIntervalMs);
                elapsed += pollIntervalMs;

                var refreshed = documentRepository.findById(doc.getId()).orElse(null);
                if (refreshed == null) {
                    log.error("Document {} disappeared during processing", doc.getId());
                    job.setDocumentsFailed(job.getDocumentsFailed() + 1);
                    jobRepository.save(job);
                    return;
                }

                String status = refreshed.getStatus();
                if ("COMPLETED".equals(status)) {
                    log.info("Document {} processed successfully ({} chunks)",
                            doc.getId(), refreshed.getTotalChunks());
                    job.setDocumentsProcessed(job.getDocumentsProcessed() + 1);
                    jobRepository.save(job);
                    return;
                } else if ("FAILED".equals(status)) {
                    log.warn("Document {} processing failed: {}",
                            doc.getId(), refreshed.getErrorMessage());
                    job.setDocumentsFailed(job.getDocumentsFailed() + 1);
                    jobRepository.save(job);
                    return;
                }
            }

            // Timeout
            log.error("Document {} processing timed out after {}s", doc.getId(), maxWaitSeconds);
            job.setDocumentsFailed(job.getDocumentsFailed() + 1);
            jobRepository.save(job);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while processing document {}", doc.getId());
            job.setDocumentsFailed(job.getDocumentsFailed() + 1);
            jobRepository.save(job);
        }
    }

    public void processBatchAsync(List<LegalDocumentEntity> documents, List<byte[]> contents,
                                   ScrapingJobEntity job) {
        executor.submit(() -> {
            try {
                job.setStatus("PROCESSING");
                job.setStartedAt(Instant.now());
                jobRepository.save(job);

                for (int i = 0; i < documents.size(); i++) {
                    log.info("Processing document {}/{}: {}", i + 1, documents.size(),
                            documents.get(i).getTitle());
                    processDocument(documents.get(i), contents.get(i), job);
                }

                job.setStatus("COMPLETED");
                job.setCompletedAt(Instant.now());
                jobRepository.save(job);

                log.info("Batch job {} completed: {} processed, {} failed",
                        job.getId(), job.getDocumentsProcessed(), job.getDocumentsFailed());

            } catch (Exception e) {
                log.error("Batch job {} failed: {}", job.getId(), e.getMessage(), e);
                job.setStatus("FAILED");
                job.setErrorMessage(e.getMessage());
                job.setCompletedAt(Instant.now());
                jobRepository.save(job);
            }
        });
    }
}

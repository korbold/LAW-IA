package com.legaltech.infrastructure.web.controller.admin;

import com.legaltech.application.usecase.admin.AuditService;
import com.legaltech.application.usecase.admin.BatchDocumentProcessingService;
import com.legaltech.application.usecase.admin.DocumentProcessingService;
import com.legaltech.infrastructure.persistence.entity.LegalDocumentEntity;
import com.legaltech.infrastructure.persistence.repository.JpaLegalDocumentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

@RestController
@RequestMapping("/api/v1/admin/documents")
public class AdminDocumentController {

    private static final Logger log = LoggerFactory.getLogger(AdminDocumentController.class);

    private final JpaLegalDocumentRepository documentRepository;
    private final DocumentProcessingService processingService;
    private final BatchDocumentProcessingService batchService;
    private final AuditService auditService;
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    public AdminDocumentController(JpaLegalDocumentRepository documentRepository,
                                    DocumentProcessingService processingService,
                                    BatchDocumentProcessingService batchService,
                                    AuditService auditService) {
        this.documentRepository = documentRepository;
        this.processingService = processingService;
        this.batchService = batchService;
        this.auditService = auditService;
    }

    @GetMapping
    public Map<String, Object> getDocuments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        var result = documentRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));

        var docs = result.getContent().stream().map(this::toResponse).toList();

        return Map.of(
                "content", docs,
                "totalElements", result.getTotalElements(),
                "totalPages", result.getTotalPages(),
                "page", result.getNumber(),
                "size", result.getSize()
        );
    }

    @PostMapping
    public Map<String, Object> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @AuthenticationPrincipal Jwt admin) {

        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Archivo vacio");
        }

        String fileName = file.getOriginalFilename();
        String fileType = detectFileType(fileName);

        if (fileType == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Tipo de archivo no soportado. Use PDF, DOCX o TXT.");
        }

        // Save document record
        var doc = LegalDocumentEntity.builder()
                .title(title)
                .fileName(fileName != null ? fileName : "document")
                .fileType(fileType)
                .fileSize(file.getSize())
                .status("PENDING")
                .uploadedBy(admin.getSubject())
                .uploadedByEmail(admin.getClaimAsString("email"))
                .build();
        documentRepository.save(doc);

        // Start async processing
        try {
            byte[] content = file.getBytes();
            processingService.processAsync(doc.getId(), content);
        } catch (Exception e) {
            doc.setStatus("FAILED");
            doc.setErrorMessage("Error leyendo archivo: " + e.getMessage());
            documentRepository.save(doc);
        }

        auditService.log(admin, "DOCUMENT_UPLOADED", "LegalDocument", doc.getId(),
                "Uploaded: " + title + " (" + fileName + ")");

        return toResponse(doc);
    }

    @DeleteMapping("/{id}")
    public Map<String, String> deleteDocument(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt admin) {

        var doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        auditService.log(admin, "DOCUMENT_DELETED", "LegalDocument", id,
                "Deleted: " + doc.getTitle());

        documentRepository.delete(doc);
        return Map.of("status", "deleted");
    }

    @GetMapping("/{id}")
    public Map<String, Object> getDocument(@PathVariable String id) {
        var doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return toResponse(doc);
    }

    @PostMapping("/{id}/reprocess")
    public Map<String, Object> reprocessDocument(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt admin) {

        var doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (doc.getSourceUrl() == null || doc.getSourceUrl().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Documento sin URL de origen");
        }

        doc.setStatus("PENDING");
        doc.setErrorMessage(null);
        doc.setTotalChunks(0);
        documentRepository.save(doc);

        executor.submit(() -> {
            try {
                byte[] content = batchService.downloadPdfWithRetry(doc.getSourceUrl());
                doc.setFileSize((long) content.length);
                documentRepository.save(doc);
                processingService.processAsync(doc.getId(), content);
            } catch (Exception e) {
                log.error("Reprocess failed for {}: {}", doc.getTitle(), e.getMessage());
                doc.setStatus("FAILED");
                doc.setErrorMessage(e.getMessage());
                documentRepository.save(doc);
            }
        });

        auditService.log(admin, "DOCUMENT_REPROCESSED", "LegalDocument", id,
                "Reprocessed: " + doc.getTitle());

        return toResponse(doc);
    }

    @PostMapping("/reprocess-pending")
    public Map<String, Object> reprocessAllPending() {

        List<LegalDocumentEntity> pending = documentRepository.findAll().stream()
                .filter(d -> ("PENDING".equals(d.getStatus()) || "FAILED".equals(d.getStatus()) || "PROCESSING".equals(d.getStatus()))
                        && d.getSourceUrl() != null && !d.getSourceUrl().isBlank()
                        && d.getFileSize() > 100)
                .toList();

        log.info("Reprocessing {} pending documents", pending.size());

        executor.submit(() -> {
            for (var doc : pending) {
                try {
                    log.info("Reprocessing: {}", doc.getTitle());
                    doc.setStatus("PROCESSING");
                    doc.setErrorMessage(null);
                    doc.setTotalChunks(0);
                    documentRepository.save(doc);

                    byte[] content = batchService.downloadPdfWithRetry(doc.getSourceUrl());
                    doc.setFileSize((long) content.length);
                    documentRepository.save(doc);
                    processingService.processAsync(doc.getId(), content);

                    // Wait for processing to complete before next doc (avoid Gemini rate limits)
                    Thread.sleep(5000);
                } catch (Exception e) {
                    log.error("Reprocess failed for {}: {}", doc.getTitle(), e.getMessage());
                    doc.setStatus("FAILED");
                    doc.setErrorMessage(e.getMessage());
                    documentRepository.save(doc);
                }
            }
            log.info("Batch reprocess completed");
        });

        return Map.of(
                "queued", pending.size(),
                "message", "Reprocesando " + pending.size() + " documentos pendientes"
        );
    }

    private String detectFileType(String fileName) {
        if (fileName == null) return null;
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".pdf")) return "pdf";
        if (lower.endsWith(".docx")) return "docx";
        if (lower.endsWith(".txt")) return "txt";
        return null;
    }

    private Map<String, Object> toResponse(LegalDocumentEntity doc) {
        return Map.ofEntries(
                Map.entry("id", doc.getId()),
                Map.entry("title", doc.getTitle()),
                Map.entry("fileName", doc.getFileName()),
                Map.entry("fileType", doc.getFileType()),
                Map.entry("fileSize", doc.getFileSize()),
                Map.entry("status", doc.getStatus()),
                Map.entry("totalChunks", doc.getTotalChunks() != null ? doc.getTotalChunks() : 0),
                Map.entry("uploadedByEmail", doc.getUploadedByEmail()),
                Map.entry("errorMessage", doc.getErrorMessage() != null ? doc.getErrorMessage() : ""),
                Map.entry("createdAt", doc.getCreatedAt().toString()),
                Map.entry("updatedAt", doc.getUpdatedAt().toString())
        );
    }
}

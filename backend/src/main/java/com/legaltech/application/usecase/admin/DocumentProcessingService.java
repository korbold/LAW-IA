package com.legaltech.application.usecase.admin;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.legaltech.infrastructure.config.GeminiConfig;
import com.legaltech.infrastructure.persistence.entity.LegalDocumentEntity;
import com.legaltech.infrastructure.persistence.repository.JpaLegalDocumentRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class DocumentProcessingService {

    private static final Logger log = LoggerFactory.getLogger(DocumentProcessingService.class);
    private static final int CHUNK_SIZE = 1500;
    private static final int CHUNK_OVERLAP = 200;

    private final JpaLegalDocumentRepository documentRepository;
    private final JdbcTemplate jdbcTemplate;
    private final GeminiConfig geminiConfig;
    private final ObjectMapper objectMapper;
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    public DocumentProcessingService(JpaLegalDocumentRepository documentRepository,
                                      JdbcTemplate jdbcTemplate,
                                      GeminiConfig geminiConfig) {
        this.documentRepository = documentRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.geminiConfig = geminiConfig;
        this.objectMapper = new ObjectMapper();
    }

    public void processAsync(String documentId, byte[] fileContent) {
        executor.submit(() -> {
            try {
                process(documentId, fileContent);
            } catch (Exception e) {
                log.error("Error processing document {}", documentId, e);
                updateStatus(documentId, "FAILED", e.getMessage());
            }
        });
    }

    private void process(String documentId, byte[] fileContent) {
        updateStatus(documentId, "PROCESSING", null);

        var doc = documentRepository.findById(documentId).orElseThrow();
        log.info("Processing document: {} ({})", doc.getTitle(), doc.getFileType());

        // 1. Extract text
        String text;
        try {
            text = extractText(fileContent, doc.getFileType());
        } catch (Exception e) {
            updateStatus(documentId, "FAILED", "Error extrayendo texto: " + e.getMessage());
            return;
        }

        if (text == null || text.isBlank()) {
            updateStatus(documentId, "FAILED", "No se pudo extraer texto del documento");
            return;
        }

        log.info("Extracted {} characters from document {}", text.length(), documentId);

        // 2. Split into chunks
        List<String> chunks = splitIntoChunks(text);
        log.info("Split into {} chunks", chunks.size());

        // 3. Generate embeddings and store chunks
        int stored = 0;
        for (int i = 0; i < chunks.size(); i++) {
            try {
                float[] embedding = generateEmbedding(chunks.get(i));
                storeChunk(documentId, i, chunks.get(i), embedding);
                stored++;

                if (i % 10 == 0) {
                    log.info("Processed chunk {}/{} for document {}", i + 1, chunks.size(), documentId);
                }
            } catch (Exception e) {
                log.warn("Failed to process chunk {} of document {}: {}", i, documentId, e.getMessage());
            }
        }

        // 4. Update document status
        doc.setStatus("COMPLETED");
        doc.setTotalChunks(stored);
        doc.setUpdatedAt(Instant.now());
        documentRepository.save(doc);

        log.info("Document {} processed: {} chunks stored", documentId, stored);
    }

    private String extractText(byte[] content, String fileType) throws IOException {
        return switch (fileType.toLowerCase()) {
            case "pdf", "application/pdf" -> extractPdfText(content);
            case "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> extractDocxText(content);
            case "txt", "text/plain" -> new String(content, StandardCharsets.UTF_8);
            default -> throw new IllegalArgumentException("Tipo de archivo no soportado: " + fileType);
        };
    }

    private String extractPdfText(byte[] content) throws IOException {
        try (var document = Loader.loadPDF(content)) {
            var stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    private String extractDocxText(byte[] content) throws IOException {
        try (var document = new XWPFDocument(new ByteArrayInputStream(content))) {
            var sb = new StringBuilder();
            for (XWPFParagraph para : document.getParagraphs()) {
                sb.append(para.getText()).append("\n");
            }
            return sb.toString();
        }
    }

    List<String> splitIntoChunks(String text) {
        List<String> chunks = new ArrayList<>();
        // Clean text
        text = text.replaceAll("\\r\\n", "\n").replaceAll("\\n{3,}", "\n\n").trim();

        int start = 0;
        while (start < text.length()) {
            int end = Math.min(start + CHUNK_SIZE, text.length());

            // Try to break at paragraph or sentence boundary
            if (end < text.length()) {
                int paragraphBreak = text.lastIndexOf("\n\n", end);
                if (paragraphBreak > start + CHUNK_SIZE / 2) {
                    end = paragraphBreak;
                } else {
                    int sentenceBreak = text.lastIndexOf(". ", end);
                    if (sentenceBreak > start + CHUNK_SIZE / 2) {
                        end = sentenceBreak + 1;
                    }
                }
            }

            String chunk = text.substring(start, end).trim();
            if (!chunk.isEmpty() && chunk.length() > 50) {
                chunks.add(chunk);
            }

            start = Math.max(start + 1, end - CHUNK_OVERLAP);
        }

        return chunks;
    }

    float[] generateEmbedding(String text) throws IOException {
        String url = "%s/models/gemini-embedding-001:embedContent?key=%s".formatted(
                geminiConfig.baseUrl(), geminiConfig.apiKey());

        var requestBody = Map.of(
                "model", "models/gemini-embedding-001",
                "content", Map.of("parts", List.of(Map.of("text", text))),
                "outputDimensionality", 768
        );

        String jsonBody = objectMapper.writeValueAsString(requestBody);

        HttpURLConnection connection = (HttpURLConnection) URI.create(url).toURL().openConnection();
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setDoOutput(true);
        connection.setConnectTimeout(30_000);
        connection.setReadTimeout(30_000);
        connection.getOutputStream().write(jsonBody.getBytes(StandardCharsets.UTF_8));

        int responseCode = connection.getResponseCode();
        if (responseCode != 200) {
            String error = new String(connection.getErrorStream().readAllBytes(), StandardCharsets.UTF_8);
            throw new IOException("Gemini embedding API error " + responseCode + ": " + error);
        }

        String response = new String(connection.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        JsonNode root = objectMapper.readTree(response);
        JsonNode values = root.path("embedding").path("values");

        float[] embedding = new float[values.size()];
        for (int i = 0; i < values.size(); i++) {
            embedding[i] = (float) values.get(i).asDouble();
        }
        return embedding;
    }

    private void storeChunk(String documentId, int index, String content, float[] embedding) {
        String embeddingStr = "[" + String.join(",",
                java.util.stream.IntStream.range(0, embedding.length)
                        .mapToObj(i -> String.valueOf(embedding[i]))
                        .toArray(String[]::new)) + "]";

        jdbcTemplate.update(
                "INSERT INTO document_chunks (id, document_id, chunk_index, content, embedding) VALUES (?::uuid, ?::uuid, ?, ?, ?::vector)",
                UUID.randomUUID().toString(), documentId, index, content, embeddingStr
        );
    }

    public List<String> searchRelevantChunks(String query, int maxResults) {
        try {
            float[] queryEmbedding = generateEmbedding(query);
            String embeddingStr = "[" + String.join(",",
                    java.util.stream.IntStream.range(0, queryEmbedding.length)
                            .mapToObj(i -> String.valueOf(queryEmbedding[i]))
                            .toArray(String[]::new)) + "]";

            return jdbcTemplate.queryForList(
                    "SELECT content FROM match_document_chunks(?::vector, 0.5, ?)",
                    String.class, embeddingStr, maxResults
            );
        } catch (Exception e) {
            log.error("Error searching chunks: {}", e.getMessage());
            return List.of();
        }
    }

    private void updateStatus(String documentId, String status, String errorMessage) {
        documentRepository.findById(documentId).ifPresent(doc -> {
            doc.setStatus(status);
            doc.setErrorMessage(errorMessage);
            doc.setUpdatedAt(Instant.now());
            documentRepository.save(doc);
        });
    }
}

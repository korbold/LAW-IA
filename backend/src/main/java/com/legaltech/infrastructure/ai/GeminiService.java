package com.legaltech.infrastructure.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.legaltech.infrastructure.config.GeminiConfig;
import com.legaltech.infrastructure.persistence.repository.JpaSystemPromptRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    private static final String FALLBACK_PROMPT = "Eres un asistente legal ecuatoriano. Responde siempre en español.";

    private final GeminiConfig config;
    private final ObjectMapper objectMapper;
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
    private final com.legaltech.application.usecase.admin.DocumentProcessingService documentProcessingService;
    private final JpaSystemPromptRepository systemPromptRepository;

    public GeminiService(GeminiConfig config,
                         com.legaltech.application.usecase.admin.DocumentProcessingService documentProcessingService,
                         JpaSystemPromptRepository systemPromptRepository) {
        this.config = config;
        this.objectMapper = new ObjectMapper();
        this.documentProcessingService = documentProcessingService;
        this.systemPromptRepository = systemPromptRepository;
    }

    private String getActiveSystemPrompt() {
        return systemPromptRepository.findFirstByActiveTrueOrderByCreatedAtDesc()
                .map(p -> p.getContent())
                .orElse(FALLBACK_PROMPT);
    }

    public void streamResponse(String userMessage, List<Map<String, Object>> conversationHistory,
                               SseEmitter emitter, java.util.function.Consumer<String> onComplete) {
        executor.submit(() -> {
            var fullResponse = new StringBuilder();
            try {
                log.debug("Sending message to Gemini: {}", userMessage);
                String url = "%s/models/%s:streamGenerateContent?alt=sse&key=%s".formatted(
                        config.baseUrl(), config.model(), config.apiKey());

                var requestBody = buildRequestBody(userMessage, conversationHistory);
                String jsonBody = objectMapper.writeValueAsString(requestBody);

                HttpURLConnection connection = (HttpURLConnection) URI.create(url).toURL().openConnection();
                connection.setRequestMethod("POST");
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setDoOutput(true);
                connection.setConnectTimeout(10_000);
                connection.setReadTimeout(60_000);

                connection.getOutputStream().write(jsonBody.getBytes(StandardCharsets.UTF_8));

                int responseCode = connection.getResponseCode();
                if (responseCode != 200) {
                    String error = new String(connection.getErrorStream().readAllBytes(), StandardCharsets.UTF_8);
                    log.error("Gemini API error {}: {}", responseCode, error);
                    emitter.send(SseEmitter.event().data("Error al consultar la IA. Intente nuevamente.").name("message"));
                    emitter.send(SseEmitter.event().data("[DONE]").name("message"));
                    emitter.complete();
                    return;
                }

                try (var reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (line.startsWith("data: ")) {
                            String jsonData = line.substring(6).trim();
                            if (jsonData.isEmpty()) continue;

                            String text = extractText(jsonData);
                            if (text != null && !text.isEmpty()) {
                                fullResponse.append(text);
                                emitter.send(SseEmitter.event().data(text).name("message"));
                            }
                        }
                    }
                }

                emitter.send(SseEmitter.event().data("[DONE]").name("message"));
                emitter.complete();

                // Save assistant response
                if (!fullResponse.isEmpty()) {
                    onComplete.accept(fullResponse.toString());
                }

            } catch (IOException e) {
                log.error("Error streaming Gemini response", e);
                try {
                    emitter.send(SseEmitter.event().data("Error de conexión con la IA.").name("message"));
                    emitter.send(SseEmitter.event().data("[DONE]").name("message"));
                    emitter.complete();
                } catch (IOException ex) {
                    emitter.completeWithError(ex);
                }
            }
        });
    }

    private Map<String, Object> buildRequestBody(String userMessage, List<Map<String, Object>> conversationHistory) {
        // Load active prompt from DB, fallback to default
        String basePrompt = getActiveSystemPrompt();

        // RAG: Search relevant legal document chunks
        List<String> relevantChunks = documentProcessingService.searchRelevantChunks(userMessage, 8);

        String systemPrompt = basePrompt;
        if (!relevantChunks.isEmpty()) {
            String context = String.join("\n\n---\n\n", relevantChunks);
            systemPrompt = basePrompt + """

            ## CONTEXTO LEGAL DE DOCUMENTOS OFICIALES CARGADOS EN EL SISTEMA
            A continuación se presentan fragmentos de documentos legales oficiales ecuatorianos que son \
            relevantes para la consulta del usuario. DEBES usar esta información para fundamentar tu respuesta. \
            Cita textualmente los artículos cuando sea pertinente. Indica que la información proviene de \
            la base de datos legal del sistema.

            """ + context;
            log.info("RAG: Injected {} document chunks into prompt for query: {}", relevantChunks.size(),
                    userMessage.substring(0, Math.min(80, userMessage.length())));
        }

        return Map.of(
                "system_instruction", Map.of(
                        "parts", List.of(Map.of("text", systemPrompt))
                ),
                "contents", conversationHistory,
                "generationConfig", Map.of(
                        "temperature", 0.7,
                        "maxOutputTokens", 4096
                )
        );
    }

    private String extractText(String jsonData) {
        try {
            JsonNode root = objectMapper.readTree(jsonData);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray()) {
                    var sb = new StringBuilder();
                    for (JsonNode part : parts) {
                        boolean isThought = part.path("thought").asBoolean(false);
                        if (!isThought && part.has("text")) {
                            sb.append(part.path("text").asText(""));
                        }
                    }
                    String result = sb.toString();
                    if (!result.isEmpty()) {
                        log.debug("Extracted text chunk: {}", result.substring(0, Math.min(50, result.length())));
                    }
                    return result.isEmpty() ? null : result;
                }
            }
        } catch (Exception e) {
            log.warn("Could not parse Gemini chunk: {}", jsonData, e);
        }
        return null;
    }
}

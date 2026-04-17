package com.legaltech.application.usecase;

import com.legaltech.domain.model.ChatMessage;
import com.legaltech.infrastructure.ai.GeminiService;
import com.legaltech.infrastructure.persistence.entity.ChatMessageEntity;
import com.legaltech.infrastructure.persistence.entity.ChatSessionEntity;
import com.legaltech.infrastructure.persistence.repository.JpaChatMessageRepository;
import com.legaltech.infrastructure.persistence.repository.JpaChatSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ProcessChatMessageUseCase {

    private final GeminiService geminiService;
    private final JpaChatSessionRepository sessionRepository;
    private final JpaChatMessageRepository messageRepository;

    public ProcessChatMessageUseCase(GeminiService geminiService,
                                      JpaChatSessionRepository sessionRepository,
                                      JpaChatMessageRepository messageRepository) {
        this.geminiService = geminiService;
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
    }

    public SseEmitter execute(String userId, String sessionId, String userMessage) {
        // Get or create session
        ChatSessionEntity session = sessionRepository.findById(sessionId)
                .orElseGet(() -> sessionRepository.save(ChatSessionEntity.builder()
                        .id(sessionId)
                        .userId(userId)
                        .build()));

        // Save user message
        messageRepository.save(ChatMessageEntity.builder()
                .id(UUID.randomUUID().toString())
                .session(session)
                .userId(userId)
                .role(ChatMessage.Role.USER)
                .content(userMessage)
                .build());

        session.setLastMessageAt(Instant.now());
        sessionRepository.save(session);

        // Load conversation history (last 20 messages to avoid token overflow)
        List<ChatMessageEntity> history = messageRepository
                .findBySessionIdOrderByCreatedAtAsc(sessionId);
        int maxHistory = Math.min(history.size(), 20);
        List<Map<String, Object>> conversationHistory = history
                .subList(history.size() - maxHistory, history.size())
                .stream()
                .map(msg -> Map.<String, Object>of(
                        "role", msg.getRole() == ChatMessage.Role.USER ? "user" : "model",
                        "parts", List.of(Map.of("text", msg.getContent()))
                ))
                .collect(Collectors.toList());

        var emitter = new SseEmitter(120_000L);

        // Stream response and save assistant message when done
        geminiService.streamResponse(userMessage, conversationHistory, emitter, (assistantResponse) -> {
            messageRepository.save(ChatMessageEntity.builder()
                    .id(UUID.randomUUID().toString())
                    .session(session)
                    .userId(userId)
                    .role(ChatMessage.Role.ASSISTANT)
                    .content(assistantResponse)
                    .build());

            session.setLastMessageAt(Instant.now());
            sessionRepository.save(session);
        });

        return emitter;
    }
}

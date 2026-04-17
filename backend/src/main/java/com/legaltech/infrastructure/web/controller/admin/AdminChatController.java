package com.legaltech.infrastructure.web.controller.admin;

import com.legaltech.infrastructure.persistence.entity.ChatMessageEntity;
import com.legaltech.infrastructure.persistence.entity.ChatSessionEntity;
import com.legaltech.infrastructure.persistence.entity.UserEntity;
import com.legaltech.infrastructure.persistence.repository.JpaChatMessageRepository;
import com.legaltech.infrastructure.persistence.repository.JpaChatSessionRepository;
import com.legaltech.infrastructure.persistence.repository.JpaUserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/chat-sessions")
public class AdminChatController {

    private final JpaChatSessionRepository sessionRepository;
    private final JpaChatMessageRepository messageRepository;
    private final JpaUserRepository userRepository;

    public AdminChatController(JpaChatSessionRepository sessionRepository,
                                JpaChatMessageRepository messageRepository,
                                JpaUserRepository userRepository) {
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public Map<String, Object> getSessions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String userEmail,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {

        // Resolve userId from email if provided
        String resolvedUserId = userId;
        if (userEmail != null && !userEmail.isBlank()) {
            resolvedUserId = userRepository.findByEmail(userEmail)
                    .map(UserEntity::getId)
                    .orElse("__NONE__");
        }

        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Instant from = dateFrom != null ? Instant.parse(dateFrom + "T00:00:00Z") : null;
        Instant to = dateTo != null ? Instant.parse(dateTo + "T23:59:59Z") : null;

        Page<ChatSessionEntity> result = sessionRepository.findFiltered(resolvedUserId, from, to, pageable);

        var sessions = result.getContent().stream().map(this::toSessionResponse).toList();

        return Map.of(
                "content", sessions,
                "totalElements", result.getTotalElements(),
                "totalPages", result.getTotalPages(),
                "page", result.getNumber(),
                "size", result.getSize()
        );
    }

    @GetMapping("/{id}")
    public Map<String, Object> getSessionDetail(@PathVariable String id) {
        var session = sessionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        List<ChatMessageEntity> messages = messageRepository.findBySessionIdOrderByCreatedAtAsc(id);

        var messageDtos = messages.stream().map(m -> Map.<String, Object>of(
                "id", m.getId(),
                "sessionId", id,
                "role", m.getRole().name(),
                "content", m.getContent(),
                "createdAt", m.getCreatedAt().toString()
        )).toList();

        return Map.of(
                "session", toSessionResponse(session),
                "messages", messageDtos
        );
    }

    private Map<String, Object> toSessionResponse(ChatSessionEntity session) {
        var user = userRepository.findById(session.getUserId()).orElse(null);
        long messageCount = messageRepository.findBySessionIdOrderByCreatedAtAsc(session.getId()).size();

        return Map.ofEntries(
                Map.entry("id", session.getId()),
                Map.entry("userId", session.getUserId()),
                Map.entry("userEmail", user != null ? user.getEmail() : "unknown"),
                Map.entry("userDisplayName", user != null && user.getDisplayName() != null ? user.getDisplayName() : "unknown"),
                Map.entry("messageCount", messageCount),
                Map.entry("createdAt", session.getCreatedAt().toString()),
                Map.entry("lastMessageAt", session.getLastMessageAt() != null ? session.getLastMessageAt().toString() : session.getCreatedAt().toString())
        );
    }
}

package com.legaltech.domain.model;

import java.time.Instant;

public record ChatMessage(
        String id,
        String sessionId,
        String userId,
        Role role,
        String content,
        Instant createdAt
) {
    public enum Role {
        USER, ASSISTANT
    }
}

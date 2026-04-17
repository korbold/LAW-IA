package com.legaltech.infrastructure.web.dto;

public record ChatRequest(
        String sessionId,
        String content
) {
}

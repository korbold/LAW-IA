package com.legaltech.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "gemini")
public record GeminiConfig(
        String apiKey,
        String model,
        String baseUrl
) {}

package com.legaltech.infrastructure.web.controller;

import com.legaltech.application.usecase.ProcessChatMessageUseCase;
import com.legaltech.infrastructure.web.dto.ChatRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    private final ProcessChatMessageUseCase processChatMessage;

    public ChatController(ProcessChatMessageUseCase processChatMessage) {
        this.processChatMessage = processChatMessage;
    }

    @PostMapping(value = "/stream", produces = "text/event-stream")
    public SseEmitter streamChat(
            @RequestBody ChatRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getSubject();
        return processChatMessage.execute(userId, request.sessionId(), request.content());
    }
}

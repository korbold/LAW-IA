package com.legaltech.domain.repository;

import com.legaltech.domain.model.ChatMessage;

import java.util.List;

public interface ChatRepository {

    ChatMessage save(ChatMessage message);

    List<ChatMessage> findBySessionId(String sessionId);
}

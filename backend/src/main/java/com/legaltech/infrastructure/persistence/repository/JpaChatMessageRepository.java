package com.legaltech.infrastructure.persistence.repository;

import com.legaltech.infrastructure.persistence.entity.ChatMessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface JpaChatMessageRepository extends JpaRepository<ChatMessageEntity, String> {

    List<ChatMessageEntity> findBySessionIdOrderByCreatedAtAsc(String sessionId);

    long countByUserId(String userId);

    long countByCreatedAtAfter(Instant after);
}

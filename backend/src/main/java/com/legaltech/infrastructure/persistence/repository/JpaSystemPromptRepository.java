package com.legaltech.infrastructure.persistence.repository;

import com.legaltech.infrastructure.persistence.entity.SystemPromptEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JpaSystemPromptRepository extends JpaRepository<SystemPromptEntity, String> {

    Optional<SystemPromptEntity> findFirstByActiveTrueOrderByCreatedAtDesc();

    List<SystemPromptEntity> findByActiveFalseOrderByCreatedAtDesc();
}

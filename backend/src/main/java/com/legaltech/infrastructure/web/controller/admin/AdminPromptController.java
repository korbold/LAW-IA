package com.legaltech.infrastructure.web.controller.admin;

import com.legaltech.application.usecase.admin.AuditService;
import com.legaltech.infrastructure.persistence.entity.SystemPromptEntity;
import com.legaltech.infrastructure.persistence.repository.JpaSystemPromptRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/prompts/system")
public class AdminPromptController {

    private final JpaSystemPromptRepository promptRepository;
    private final AuditService auditService;

    public AdminPromptController(JpaSystemPromptRepository promptRepository,
                                  AuditService auditService) {
        this.promptRepository = promptRepository;
        this.auditService = auditService;
    }

    @GetMapping
    public Map<String, Object> getCurrentPrompt() {
        var prompt = promptRepository.findFirstByActiveTrueOrderByCreatedAtDesc().orElse(null);
        if (prompt == null) {
            return Map.of("id", "", "content", "", "updatedBy", "", "updatedByEmail", "", "createdAt", "");
        }
        return toResponse(prompt);
    }

    @PutMapping
    public Map<String, Object> updatePrompt(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal Jwt admin) {

        // Deactivate current prompt
        promptRepository.findFirstByActiveTrueOrderByCreatedAtDesc().ifPresent(current -> {
            current.setActive(false);
            promptRepository.save(current);
        });

        // Create new active prompt
        var newPrompt = SystemPromptEntity.builder()
                .content(body.get("content"))
                .updatedBy(admin.getSubject())
                .updatedByEmail(admin.getClaimAsString("email"))
                .active(true)
                .build();
        promptRepository.save(newPrompt);

        auditService.log(admin, "SYSTEM_PROMPT_UPDATED", "SystemPrompt", newPrompt.getId(),
                "System prompt updated");

        return toResponse(newPrompt);
    }

    @GetMapping("/history")
    public Map<String, Object> getHistory() {
        var current = promptRepository.findFirstByActiveTrueOrderByCreatedAtDesc().orElse(null);
        var versions = promptRepository.findByActiveFalseOrderByCreatedAtDesc();

        return Map.of(
                "current", current != null ? toResponse(current) : Map.of(),
                "versions", versions.stream().map(this::toResponse).toList()
        );
    }

    private Map<String, Object> toResponse(SystemPromptEntity prompt) {
        return Map.of(
                "id", prompt.getId(),
                "content", prompt.getContent(),
                "updatedBy", prompt.getUpdatedBy(),
                "updatedByEmail", prompt.getUpdatedByEmail(),
                "createdAt", prompt.getCreatedAt().toString()
        );
    }
}

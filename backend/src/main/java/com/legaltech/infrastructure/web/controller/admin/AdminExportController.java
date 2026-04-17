package com.legaltech.infrastructure.web.controller.admin;

import com.legaltech.application.usecase.admin.AuditService;
import com.legaltech.domain.model.UserRole;
import com.legaltech.domain.model.UserStatus;
import com.legaltech.infrastructure.persistence.entity.ChatSessionEntity;
import com.legaltech.infrastructure.persistence.entity.UserEntity;
import com.legaltech.infrastructure.persistence.repository.JpaChatSessionRepository;
import com.legaltech.infrastructure.persistence.repository.JpaUserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/export")
public class AdminExportController {

    private final JpaUserRepository userRepository;
    private final JpaChatSessionRepository sessionRepository;
    private final AuditService auditService;

    public AdminExportController(JpaUserRepository userRepository,
                                  JpaChatSessionRepository sessionRepository,
                                  AuditService auditService) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.auditService = auditService;
    }

    @GetMapping("/users")
    public ResponseEntity<byte[]> exportUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) UserStatus status,
            @AuthenticationPrincipal Jwt admin) {

        var pageable = PageRequest.of(0, 10000, Sort.by(Sort.Direction.DESC, "createdAt"));
        var users = userRepository.findFiltered(search, role, status, pageable);

        var sb = new StringBuilder();
        sb.append("ID,Email,Nombre,Rol,Estado,Fecha Registro\n");
        for (UserEntity user : users.getContent()) {
            sb.append(escape(user.getId())).append(",");
            sb.append(escape(user.getEmail())).append(",");
            sb.append(escape(user.getDisplayName())).append(",");
            sb.append(user.getRole()).append(",");
            sb.append(user.getStatus()).append(",");
            sb.append(user.getCreatedAt()).append("\n");
        }

        auditService.log(admin, "DATA_EXPORTED", "User", null, "Exported users CSV");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=usuarios.csv")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(sb.toString().getBytes());
    }

    @GetMapping("/chat-sessions")
    public ResponseEntity<byte[]> exportChatSessions(
            @RequestParam(required = false) String userEmail,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @AuthenticationPrincipal Jwt admin) {

        var pageable = PageRequest.of(0, 10000, Sort.by(Sort.Direction.DESC, "createdAt"));
        var sessions = sessionRepository.findFiltered(null, null, null, pageable);

        var sb = new StringBuilder();
        sb.append("ID,User ID,Fecha Inicio,Ultimo Mensaje\n");
        for (ChatSessionEntity session : sessions.getContent()) {
            sb.append(escape(session.getId())).append(",");
            sb.append(escape(session.getUserId())).append(",");
            sb.append(session.getCreatedAt()).append(",");
            sb.append(session.getLastMessageAt() != null ? session.getLastMessageAt() : "").append("\n");
        }

        auditService.log(admin, "DATA_EXPORTED", "ChatSession", null, "Exported chat sessions CSV");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=sesiones.csv")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(sb.toString().getBytes());
    }

    private String escape(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}

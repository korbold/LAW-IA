package com.legaltech.infrastructure.web.controller;

import com.legaltech.domain.model.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class AuthController {

    @GetMapping("/users/me")
    public User getCurrentUser(@AuthenticationPrincipal Jwt jwt) {
        return new User(
                jwt.getSubject(),
                jwt.getClaimAsString("email"),
                jwt.getClaimAsString("name")
        );
    }

    @GetMapping("/auth/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}

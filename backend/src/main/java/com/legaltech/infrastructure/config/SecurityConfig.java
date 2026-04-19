package com.legaltech.infrastructure.config;

import com.legaltech.domain.model.UserRole;
import com.legaltech.domain.model.UserStatus;
import com.legaltech.infrastructure.persistence.entity.UserEntity;
import com.legaltech.infrastructure.persistence.repository.JpaUserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;

import java.time.Instant;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JpaUserRepository userRepository;

    public SecurityConfig(JpaUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .cors(cors -> {})
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/health").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/actuator/**").hasAuthority("ROLE_ADMIN")
                        .requestMatchers("/api/v1/admin/**").hasAuthority("ROLE_ADMIN")
                        .requestMatchers("/api/v1/**").authenticated()
                        .anyRequest().denyAll())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())))
                .build();
    }

    private Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter() {
        return jwt -> {
            String userId = jwt.getSubject();
            String email = jwt.getClaimAsString("email");
            String name = jwt.getClaimAsString("name");

            // Upsert user on each request
            // First user is auto-promoted to ADMIN
            boolean isFirstUser = userRepository.count() == 0;
            UserEntity user = userRepository.findById(userId).orElseGet(() ->
                    userRepository.save(UserEntity.builder()
                            .id(userId)
                            .email(email != null ? email : "unknown")
                            .displayName(name)
                            .role(isFirstUser ? UserRole.ADMIN : UserRole.USER)
                            .status(UserStatus.ACTIVE)
                            .build()));

            // Update last login
            user.setLastLoginAt(Instant.now());
            if (name != null && !name.equals(user.getDisplayName())) {
                user.setDisplayName(name);
            }
            userRepository.save(user);

            // Map role to Spring Security authority
            List<SimpleGrantedAuthority> authorities = List.of(
                    new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
            );

            return new JwtAuthenticationToken(jwt, authorities, userId);
        };
    }
}

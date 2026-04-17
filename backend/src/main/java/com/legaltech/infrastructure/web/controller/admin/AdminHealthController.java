package com.legaltech.infrastructure.web.controller.admin;

import com.legaltech.infrastructure.config.GeminiConfig;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.net.HttpURLConnection;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/health")
public class AdminHealthController {

    private final DataSource dataSource;
    private final GeminiConfig geminiConfig;

    public AdminHealthController(DataSource dataSource, GeminiConfig geminiConfig) {
        this.dataSource = dataSource;
        this.geminiConfig = geminiConfig;
    }

    @GetMapping
    public Map<String, Object> getHealth() {
        List<Map<String, Object>> services = new ArrayList<>();

        // Backend API
        services.add(Map.of(
                "name", "Backend API",
                "status", "UP",
                "responseTimeMs", 0,
                "details", "Running on port 8080"
        ));

        // Database
        services.add(checkDatabase());

        // Gemini API
        services.add(checkGemini());

        var runtime = Runtime.getRuntime();
        long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();
        long hours = uptimeMs / 3600000;
        long minutes = (uptimeMs % 3600000) / 60000;

        return Map.of(
                "services", services,
                "uptime", hours + "h " + minutes + "m",
                "jvmMemoryUsed", runtime.totalMemory() - runtime.freeMemory(),
                "jvmMemoryMax", runtime.maxMemory(),
                "activeThreads", Thread.activeCount()
        );
    }

    private Map<String, Object> checkDatabase() {
        long start = System.currentTimeMillis();
        try (var conn = dataSource.getConnection()) {
            conn.isValid(5);
            long elapsed = System.currentTimeMillis() - start;
            return Map.of("name", "Database", "status", "UP", "responseTimeMs", elapsed, "details", "PostgreSQL connected");
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - start;
            return Map.of("name", "Database", "status", "DOWN", "responseTimeMs", elapsed, "details", e.getMessage());
        }
    }

    private Map<String, Object> checkGemini() {
        long start = System.currentTimeMillis();
        try {
            var url = URI.create(geminiConfig.baseUrl() + "/models/" + geminiConfig.model() + "?key=" + geminiConfig.apiKey());
            var conn = (HttpURLConnection) url.toURL().openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            int code = conn.getResponseCode();
            long elapsed = System.currentTimeMillis() - start;
            if (code == 200) {
                return Map.of("name", "Gemini API", "status", "UP", "responseTimeMs", elapsed, "details", "Model: " + geminiConfig.model());
            }
            return Map.of("name", "Gemini API", "status", "DEGRADED", "responseTimeMs", elapsed, "details", "HTTP " + code);
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - start;
            return Map.of("name", "Gemini API", "status", "DOWN", "responseTimeMs", elapsed, "details", e.getMessage());
        }
    }
}

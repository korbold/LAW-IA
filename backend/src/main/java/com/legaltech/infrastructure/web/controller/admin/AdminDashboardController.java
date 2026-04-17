package com.legaltech.infrastructure.web.controller.admin;

import com.legaltech.infrastructure.persistence.repository.JpaChatMessageRepository;
import com.legaltech.infrastructure.persistence.repository.JpaChatSessionRepository;
import com.legaltech.infrastructure.persistence.repository.JpaUserRepository;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminDashboardController {

    private final JpaUserRepository userRepository;
    private final JpaChatSessionRepository sessionRepository;
    private final JpaChatMessageRepository messageRepository;

    public AdminDashboardController(JpaUserRepository userRepository,
                                     JpaChatSessionRepository sessionRepository,
                                     JpaChatMessageRepository messageRepository) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
    }

    @GetMapping("/dashboard/stats")
    public Map<String, Object> getDashboardStats() {
        Instant now = Instant.now();
        Instant todayStart = LocalDate.now().atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant monthAgo = now.minus(30, ChronoUnit.DAYS);
        Instant twoMonthsAgo = now.minus(60, ChronoUnit.DAYS);

        long totalUsers = userRepository.count();
        long activeSessionsToday = sessionRepository.countByCreatedAtAfter(todayStart);
        long totalMessages = messageRepository.count();

        long usersThisMonth = userRepository.countByCreatedAtAfter(monthAgo);
        long usersLastMonth = userRepository.countByCreatedAtAfter(twoMonthsAgo) - usersThisMonth;
        double usersTrend = usersLastMonth > 0 ? ((double)(usersThisMonth - usersLastMonth) / usersLastMonth * 100) : 0;

        long messagesThisMonth = messageRepository.countByCreatedAtAfter(monthAgo);
        long messagesLastMonth = messageRepository.countByCreatedAtAfter(twoMonthsAgo) - messagesThisMonth;
        double messageTrend = messagesLastMonth > 0 ? ((double)(messagesThisMonth - messagesLastMonth) / messagesLastMonth * 100) : 0;

        return Map.of(
                "totalUsers", totalUsers,
                "activeSessionsToday", activeSessionsToday,
                "totalMessages", totalMessages,
                "systemUptime", getUptime(),
                "usersTrend", Math.round(usersTrend * 10) / 10.0,
                "sessionsTrend", 0,
                "messageTrend", Math.round(messageTrend * 10) / 10.0
        );
    }

    @GetMapping("/analytics/users-over-time")
    public Map<String, Object> getUsersOverTime(@RequestParam(defaultValue = "30") int days) {
        List<Map<String, Object>> data = generateTimeSeries(days, "users");
        return Map.of("label", "Nuevos Usuarios", "data", data);
    }

    @GetMapping("/analytics/messages-over-time")
    public Map<String, Object> getMessagesOverTime(@RequestParam(defaultValue = "30") int days) {
        List<Map<String, Object>> data = generateTimeSeries(days, "messages");
        return Map.of("label", "Mensajes", "data", data);
    }

    private List<Map<String, Object>> generateTimeSeries(int days, String type) {
        List<Map<String, Object>> data = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            Instant dayStart = date.atStartOfDay().toInstant(ZoneOffset.UTC);
            Instant dayEnd = date.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);

            long count;
            if ("users".equals(type)) {
                count = userRepository.countByCreatedAtAfter(dayStart) - userRepository.countByCreatedAtAfter(dayEnd);
            } else {
                count = messageRepository.countByCreatedAtAfter(dayStart) - messageRepository.countByCreatedAtAfter(dayEnd);
            }
            data.add(Map.of("date", date.toString(), "value", Math.max(0, count)));
        }
        return data;
    }

    private String getUptime() {
        long uptimeMs = java.lang.management.ManagementFactory.getRuntimeMXBean().getUptime();
        long hours = uptimeMs / 3600000;
        long minutes = (uptimeMs % 3600000) / 60000;
        return hours + "h " + minutes + "m";
    }
}

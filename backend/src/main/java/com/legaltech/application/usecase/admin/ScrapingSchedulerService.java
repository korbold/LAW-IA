package com.legaltech.application.usecase.admin;

import com.legaltech.infrastructure.persistence.entity.ScrapingScheduleEntity;
import com.legaltech.infrastructure.persistence.repository.JpaScrapingScheduleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
@EnableScheduling
public class ScrapingSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(ScrapingSchedulerService.class);

    private final JpaScrapingScheduleRepository scheduleRepository;
    private final RegistroOficialScraper scraper;

    public ScrapingSchedulerService(JpaScrapingScheduleRepository scheduleRepository,
                                     RegistroOficialScraper scraper) {
        this.scheduleRepository = scheduleRepository;
        this.scraper = scraper;
    }

    @Scheduled(fixedRate = 60_000)
    public void checkSchedule() {
        List<ScrapingScheduleEntity> enabledSchedules = scheduleRepository.findByEnabledTrue();

        for (ScrapingScheduleEntity schedule : enabledSchedules) {
            if (schedule.getNextExecutionAt() != null && schedule.getNextExecutionAt().isBefore(Instant.now())) {
                log.info("Executing scheduled scrape for section: {}", schedule.getSection());
                try {
                    scraper.scrapeSection(schedule.getSection());
                    schedule.setLastStatus("SUCCESS");
                } catch (Exception e) {
                    log.error("Scheduled scrape failed for section {}: {}",
                            schedule.getSection(), e.getMessage());
                    schedule.setLastStatus("FAILED");
                }

                schedule.setLastExecutionAt(Instant.now());
                schedule.setNextExecutionAt(Instant.now().plus(parseCronInterval(schedule.getCronExpression())));
                schedule.setUpdatedAt(Instant.now());
                scheduleRepository.save(schedule);
            }
        }
    }

    @Scheduled(initialDelay = 10_000, fixedRate = Long.MAX_VALUE)
    public void initializeSchedules() {
        List<ScrapingScheduleEntity> enabledSchedules = scheduleRepository.findByEnabledTrue();

        for (ScrapingScheduleEntity schedule : enabledSchedules) {
            if (schedule.getNextExecutionAt() == null) {
                schedule.setNextExecutionAt(Instant.now().plus(parseCronInterval(schedule.getCronExpression())));
                schedule.setUpdatedAt(Instant.now());
                scheduleRepository.save(schedule);
                log.info("Initialized next execution for schedule {}: {}",
                        schedule.getSection(), schedule.getNextExecutionAt());
            }
        }
    }

    // Parses interval expressions: "15d", "7d", "24h", or cron with day interval
    private Duration parseCronInterval(String cronExpression) {
        if (cronExpression == null) return Duration.ofDays(15);

        String trimmed = cronExpression.trim().toLowerCase();

        // Simple format: "15d", "7d", "24h"
        if (trimmed.endsWith("d")) {
            try {
                int days = Integer.parseInt(trimmed.substring(0, trimmed.length() - 1));
                return Duration.ofDays(days);
            } catch (NumberFormatException ignored) {}
        }
        if (trimmed.endsWith("h")) {
            try {
                int hours = Integer.parseInt(trimmed.substring(0, trimmed.length() - 1));
                return Duration.ofHours(hours);
            } catch (NumberFormatException ignored) {}
        }

        // Standard cron: try to extract day interval from "*/N" in day-of-month field
        String[] parts = trimmed.split("\\s+");
        if (parts.length >= 4 && parts[3].startsWith("*/")) {
            try {
                int days = Integer.parseInt(parts[3].substring(2));
                return Duration.ofDays(days);
            } catch (NumberFormatException ignored) {}
        }

        return Duration.ofDays(15);
    }
}

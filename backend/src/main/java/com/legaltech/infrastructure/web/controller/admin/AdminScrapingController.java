package com.legaltech.infrastructure.web.controller.admin;

import com.legaltech.application.usecase.admin.AuditService;
import com.legaltech.application.usecase.admin.InitialLoadService;
import com.legaltech.application.usecase.admin.RegistroOficialScraper;
import com.legaltech.infrastructure.persistence.entity.ScrapingJobEntity;
import com.legaltech.infrastructure.persistence.entity.ScrapingScheduleEntity;
import com.legaltech.infrastructure.persistence.repository.JpaScrapingJobRepository;
import com.legaltech.infrastructure.persistence.repository.JpaScrapingScheduleRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/scraping")
public class AdminScrapingController {

    private final JpaScrapingJobRepository jobRepository;
    private final JpaScrapingScheduleRepository scheduleRepository;
    private final InitialLoadService initialLoadService;
    private final RegistroOficialScraper scraper;
    private final AuditService auditService;

    public AdminScrapingController(JpaScrapingJobRepository jobRepository,
                                    JpaScrapingScheduleRepository scheduleRepository,
                                    InitialLoadService initialLoadService,
                                    RegistroOficialScraper scraper,
                                    AuditService auditService) {
        this.jobRepository = jobRepository;
        this.scheduleRepository = scheduleRepository;
        this.initialLoadService = initialLoadService;
        this.scraper = scraper;
        this.auditService = auditService;
    }

    @GetMapping("/status")
    public Map<String, Object> getStatus() {
        List<ScrapingJobEntity> running = jobRepository.findByStatus("PROCESSING");
        var recentPage = jobRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 5));
        List<ScrapingScheduleEntity> schedules = scheduleRepository.findAll();

        return Map.ofEntries(
                Map.entry("runningJobs", running.size()),
                Map.entry("recentJobs", recentPage.getContent().stream().map(this::toJobResponse).toList()),
                Map.entry("schedules", schedules.stream().map(this::toScheduleResponse).toList())
        );
    }

    @GetMapping("/jobs")
    public Map<String, Object> getJobs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        var result = jobRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));

        return Map.ofEntries(
                Map.entry("content", result.getContent().stream().map(this::toJobResponse).toList()),
                Map.entry("totalElements", result.getTotalElements()),
                Map.entry("totalPages", result.getTotalPages()),
                Map.entry("page", result.getNumber()),
                Map.entry("size", result.getSize())
        );
    }

    @GetMapping("/jobs/{id}")
    public Map<String, Object> getJob(@PathVariable String id) {
        var job = jobRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        return toJobResponse(job);
    }

    @PostMapping("/initial-load")
    public Map<String, Object> triggerInitialLoad(@AuthenticationPrincipal Jwt admin) {
        try {
            ScrapingJobEntity job = initialLoadService.startInitialLoad();
            auditService.log(admin, "INITIAL_LOAD_STARTED", "ScrapingJob", job.getId(),
                    "Started full initial load of legal catalog");
            return toJobResponse(job);
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
    }

    @PostMapping("/initial-load/priority/{priority}")
    public Map<String, Object> triggerInitialLoadByPriority(
            @PathVariable int priority,
            @AuthenticationPrincipal Jwt admin) {

        if (priority < 1 || priority > 4) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Priority must be between 1 and 4");
        }

        try {
            ScrapingJobEntity job = initialLoadService.startInitialLoadByPriority(priority);
            auditService.log(admin, "INITIAL_LOAD_STARTED", "ScrapingJob", job.getId(),
                    "Started initial load for priority " + priority);
            return toJobResponse(job);
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
    }

    @PostMapping("/run/{section}")
    public Map<String, Object> runScrape(
            @PathVariable String section,
            @AuthenticationPrincipal Jwt admin) {

        if (!scraper.getAvailableSections().contains(section)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unknown section: " + section + ". Available: " + scraper.getAvailableSections());
        }

        ScrapingJobEntity job = scraper.scrapeSection(section);
        if (admin != null) {
            auditService.log(admin, "SCRAPE_STARTED", "ScrapingJob", job.getId(),
                    "Started manual scrape for section: " + section);
        }
        return toJobResponse(job);
    }

    @GetMapping("/catalog")
    public List<Map<String, Object>> getCatalog() {
        return initialLoadService.getCatalogStatus();
    }

    @GetMapping("/schedule")
    public List<Map<String, Object>> getSchedules() {
        return scheduleRepository.findAll().stream()
                .map(this::toScheduleResponse)
                .toList();
    }

    @PutMapping("/schedule/{section}")
    public Map<String, Object> updateSchedule(
            @PathVariable String section,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal Jwt admin) {

        ScrapingScheduleEntity schedule = scheduleRepository.findBySection(section)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Schedule not found for section: " + section));

        if (body.containsKey("enabled")) {
            schedule.setEnabled((Boolean) body.get("enabled"));
        }
        if (body.containsKey("cronExpression")) {
            schedule.setCronExpression((String) body.get("cronExpression"));
        }
        schedule.setUpdatedAt(Instant.now());
        scheduleRepository.save(schedule);

        auditService.log(admin, "SCHEDULE_UPDATED", "ScrapingSchedule", schedule.getId(),
                "Updated schedule for section: " + section + " " + body);

        return toScheduleResponse(schedule);
    }

    private Map<String, Object> toJobResponse(ScrapingJobEntity job) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", job.getId());
        map.put("jobType", job.getJobType());
        map.put("section", job.getSection());
        map.put("status", job.getStatus());
        map.put("documentsFound", job.getDocumentsFound());
        map.put("documentsDownloaded", job.getDocumentsDownloaded());
        map.put("documentsProcessed", job.getDocumentsProcessed());
        map.put("documentsFailed", job.getDocumentsFailed());
        map.put("startedAt", job.getStartedAt() != null ? job.getStartedAt().toString() : null);
        map.put("completedAt", job.getCompletedAt() != null ? job.getCompletedAt().toString() : null);
        map.put("errorMessage", job.getErrorMessage());
        map.put("createdAt", job.getCreatedAt().toString());
        return map;
    }

    private Map<String, Object> toScheduleResponse(ScrapingScheduleEntity schedule) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", schedule.getId());
        map.put("section", schedule.getSection());
        map.put("cronExpression", schedule.getCronExpression());
        map.put("enabled", schedule.getEnabled());
        map.put("lastExecutionAt", schedule.getLastExecutionAt() != null ? schedule.getLastExecutionAt().toString() : null);
        map.put("lastStatus", schedule.getLastStatus());
        map.put("nextExecutionAt", schedule.getNextExecutionAt() != null ? schedule.getNextExecutionAt().toString() : null);
        map.put("createdAt", schedule.getCreatedAt().toString());
        map.put("updatedAt", schedule.getUpdatedAt().toString());
        return map;
    }
}

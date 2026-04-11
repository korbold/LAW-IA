package com.legaltech.application.usecase.admin;

import com.legaltech.infrastructure.persistence.entity.LegalDocumentEntity;
import com.legaltech.infrastructure.persistence.entity.ScrapingJobEntity;
import com.legaltech.infrastructure.persistence.repository.JpaLegalDocumentRepository;
import com.legaltech.infrastructure.persistence.repository.JpaScrapingJobRepository;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class RegistroOficialScraper {

    private static final Logger log = LoggerFactory.getLogger(RegistroOficialScraper.class);

    private static final Map<String, String> SECTION_URLS = Map.of(
            "REGISTRO_OFICIAL", "https://www.registroficial.gob.ec/245427-2/",
            "SUPLEMENTO", "https://www.registroficial.gob.ec/255776-2/",
            "EDICION_ESPECIAL", "https://www.registroficial.gob.ec/261974-2/",
            "EDICION_CONSTITUCIONAL", "https://www.registroficial.gob.ec/267099-2/",
            "EDICION_JURIDICA", "https://www.registroficial.gob.ec/266381-2/"
    );

    private static final Pattern EDITION_NUMBER_PATTERN = Pattern.compile("N[oº°]\\s*(\\d+)");
    private static final Pattern PAGE_COUNT_PATTERN = Pattern.compile("(\\d+)\\s*PÁGINAS", Pattern.CASE_INSENSITIVE);

    private final BatchDocumentProcessingService batchService;
    private final JpaLegalDocumentRepository documentRepository;
    private final JpaScrapingJobRepository jobRepository;

    public record EditionInfo(String title, String editionNumber, String date, Integer pageCount, String downloadUrl) {}

    public RegistroOficialScraper(BatchDocumentProcessingService batchService,
                                   JpaLegalDocumentRepository documentRepository,
                                   JpaScrapingJobRepository jobRepository) {
        this.batchService = batchService;
        this.documentRepository = documentRepository;
        this.jobRepository = jobRepository;
    }

    public ScrapingJobEntity scrapeSection(String section) {
        String sectionUrl = SECTION_URLS.get(section);
        if (sectionUrl == null) {
            throw new IllegalArgumentException("Unknown section: " + section);
        }

        ScrapingJobEntity job = ScrapingJobEntity.builder()
                .jobType("SCRAPING")
                .section(section)
                .status("PENDING")
                .build();
        jobRepository.save(job);

        try {
            List<EditionInfo> editions = fetchEditions(sectionUrl);
            job.setDocumentsFound(editions.size());
            jobRepository.save(job);

            log.info("Found {} editions for section {}", editions.size(), section);

            List<LegalDocumentEntity> newDocs = new ArrayList<>();
            List<byte[]> contents = new ArrayList<>();

            for (EditionInfo edition : editions) {
                // Skip already downloaded
                if (edition.editionNumber() != null &&
                        documentRepository.findByEditionNumberAndDocumentType(
                                edition.editionNumber(), section).isPresent()) {
                    log.debug("Skipping already downloaded edition {} of {}", edition.editionNumber(), section);
                    continue;
                }

                try {
                    byte[] pdfContent = batchService.downloadPdfWithRetry(edition.downloadUrl());
                    job.setDocumentsDownloaded(job.getDocumentsDownloaded() + 1);
                    jobRepository.save(job);

                    LegalDocumentEntity doc = LegalDocumentEntity.builder()
                            .title(edition.title() != null ? edition.title() : "Registro Oficial " + section)
                            .fileName(section + "_" + edition.editionNumber() + ".pdf")
                            .fileType("pdf")
                            .fileSize((long) pdfContent.length)
                            .status("PENDING")
                            .uploadedBy("SYSTEM")
                            .uploadedByEmail("scraper@legaltech.ec")
                            .documentType(section)
                            .editionNumber(edition.editionNumber())
                            .pageCount(edition.pageCount())
                            .sourceUrl(edition.downloadUrl())
                            .build();
                    documentRepository.save(doc);

                    newDocs.add(doc);
                    contents.add(pdfContent);

                } catch (Exception e) {
                    log.warn("Failed to download edition {} of {}: {}",
                            edition.editionNumber(), section, e.getMessage());
                    job.setDocumentsFailed(job.getDocumentsFailed() + 1);
                    jobRepository.save(job);
                }
            }

            if (!newDocs.isEmpty()) {
                batchService.processBatchAsync(newDocs, contents, job);
            } else {
                job.setStatus("COMPLETED");
                job.setCompletedAt(Instant.now());
                jobRepository.save(job);
                log.info("No new editions to process for section {}", section);
            }

        } catch (Exception e) {
            log.error("Scraping failed for section {}: {}", section, e.getMessage(), e);
            job.setStatus("FAILED");
            job.setErrorMessage(e.getMessage());
            job.setCompletedAt(Instant.now());
            jobRepository.save(job);
        }

        return job;
    }

    public List<EditionInfo> fetchEditions(String sectionUrl) throws Exception {
        Document doc = Jsoup.connect(sectionUrl)
                .userAgent("Mozilla/5.0 (compatible; LegalTechBot/1.0)")
                .timeout(30_000)
                .get();

        List<EditionInfo> editions = new ArrayList<>();

        for (Element link : doc.select("a:contains(Descargar)")) {
            String downloadUrl = link.absUrl("href");
            if (downloadUrl.isEmpty()) continue;

            // Walk up to find context
            Element parent = link.parent();
            Element container = parent;
            for (int i = 0; i < 5 && container != null; i++) {
                container = container.parent();
            }

            String contextText = container != null ? container.text() : parent.text();

            // Extract edition number
            String editionNumber = null;
            Matcher editionMatcher = EDITION_NUMBER_PATTERN.matcher(contextText);
            if (editionMatcher.find()) {
                editionNumber = editionMatcher.group(1);
            }

            // Extract page count
            Integer pageCount = null;
            Matcher pageMatcher = PAGE_COUNT_PATTERN.matcher(contextText);
            if (pageMatcher.find()) {
                pageCount = Integer.parseInt(pageMatcher.group(1));
            }

            // Extract title from nearest h4
            String title = null;
            Element h4 = container != null ? container.selectFirst("h4") : null;
            if (h4 != null) {
                title = h4.text();
            }

            editions.add(new EditionInfo(title, editionNumber, null, pageCount, downloadUrl));
        }

        return editions;
    }

    public Set<String> getAvailableSections() {
        return SECTION_URLS.keySet();
    }
}

# RAG Legal Ingestion Pipeline - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pipeline that ingests 65+ Ecuadorian legal codes from official sources and daily scrapes 5 sections of registroficial.gob.ec, processing all documents through the existing RAG pipeline (PDFBox + chunking + Gemini embeddings).

**Architecture:** Extends the existing Spring Boot backend with new JPA entities for sources/jobs/schedule, a batch processing service with rate limiting, a Registro Oficial scraper, and an initial load service for the 65 legal codes. Admin dashboard gets a new "Legal Sources" section.

**Tech Stack:** Spring Boot 3.4.3, Java 21, JPA/Hibernate, PostgreSQL (Supabase), PDFBox, Gemini Embedding API, Jsoup (HTML parsing), Next.js 16 (admin dashboard)

---

## File Structure

### Backend - New Files

| File | Responsibility |
|------|---------------|
| `backend/src/main/java/com/legaltech/infrastructure/persistence/entity/LegalSourceEntity.java` | JPA entity for legal_sources table |
| `backend/src/main/java/com/legaltech/infrastructure/persistence/entity/ScrapingJobEntity.java` | JPA entity for scraping_jobs table |
| `backend/src/main/java/com/legaltech/infrastructure/persistence/entity/ScrapingScheduleEntity.java` | JPA entity for scraping_schedule table |
| `backend/src/main/java/com/legaltech/infrastructure/persistence/repository/JpaLegalSourceRepository.java` | Repository for legal_sources |
| `backend/src/main/java/com/legaltech/infrastructure/persistence/repository/JpaScrapingJobRepository.java` | Repository for scraping_jobs |
| `backend/src/main/java/com/legaltech/infrastructure/persistence/repository/JpaScrapingScheduleRepository.java` | Repository for scraping_schedule |
| `backend/src/main/java/com/legaltech/application/usecase/admin/LegalCatalogConfig.java` | Static catalog of 65 legal codes with metadata and source URLs |
| `backend/src/main/java/com/legaltech/application/usecase/admin/BatchDocumentProcessingService.java` | Queue-based batch processor with rate limiting |
| `backend/src/main/java/com/legaltech/application/usecase/admin/RegistroOficialScraper.java` | Scrapes registroficial.gob.ec for new editions |
| `backend/src/main/java/com/legaltech/application/usecase/admin/InitialLoadService.java` | Downloads 65 legal codes from official sources |
| `backend/src/main/java/com/legaltech/application/usecase/admin/ScrapingSchedulerService.java` | @Scheduled orchestrator for daily scraping |
| `backend/src/main/java/com/legaltech/infrastructure/web/controller/admin/AdminScrapingController.java` | REST endpoints for scraping management |
| `backend/src/main/resources/db/migration/V1__scraping_tables.sql` | SQL migration script for new tables + legal_documents alterations |

### Backend - Modified Files

| File | Changes |
|------|---------|
| `backend/pom.xml` | Add Jsoup dependency |
| `backend/src/main/java/com/legaltech/infrastructure/persistence/entity/LegalDocumentEntity.java` | Add new columns: documentType, abbreviation, editionNumber, publicationDate, sourceId, sourceUrl, version, priority, pageCount |
| `backend/src/main/java/com/legaltech/infrastructure/persistence/repository/JpaLegalDocumentRepository.java` | Add query methods for new columns |

### Admin Dashboard - New Files

| File | Responsibility |
|------|---------------|
| `admin/src/app/(admin)/scraping/page.tsx` | Main scraping management page |
| `admin/src/app/(admin)/scraping/catalog/page.tsx` | Legal catalog view (65 codes) |
| `admin/src/domain/entities/scraping.ts` | TypeScript types for scraping entities |
| `admin/src/infrastructure/query/hooks/use-scraping.ts` | React Query hooks for scraping API |

### Admin Dashboard - Modified Files

| File | Changes |
|------|---------|
| `admin/src/infrastructure/api/endpoints.ts` | Add scraping endpoints |
| `admin/src/presentation/components/layout/sidebar.tsx` | Add "Fuentes Legales" nav item |
| `admin/src/infrastructure/query/keys.ts` | Add scraping query keys |

---

## Task 1: SQL Migration Script

**Files:**
- Create: `backend/src/main/resources/db/migration/V1__scraping_tables.sql`

This SQL runs manually on Supabase (consistent with existing `ddl-auto=none` approach).

- [ ] **Step 1: Create the migration SQL file**

```sql
-- V1__scraping_tables.sql
-- New tables and alterations for the RAG legal ingestion pipeline

-- 1. legal_sources table
CREATE TABLE IF NOT EXISTS legal_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    base_url VARCHAR(500),
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- 2. Alter legal_documents with new columns
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(50);
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS abbreviation VARCHAR(20);
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS edition_number VARCHAR(50);
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS publication_date DATE;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES legal_sources(id);
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS source_url VARCHAR(1000);
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS version VARCHAR(100);
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS priority INTEGER;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS page_count INTEGER;

-- Index for scraper deduplication
CREATE INDEX IF NOT EXISTS idx_legal_documents_edition_type
    ON legal_documents(edition_number, document_type);
CREATE INDEX IF NOT EXISTS idx_legal_documents_abbreviation
    ON legal_documents(abbreviation);

-- 3. scraping_jobs table
CREATE TABLE IF NOT EXISTS scraping_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES legal_sources(id),
    job_type VARCHAR(50) NOT NULL,
    section VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    documents_found INTEGER NOT NULL DEFAULT 0,
    documents_downloaded INTEGER NOT NULL DEFAULT 0,
    documents_processed INTEGER NOT NULL DEFAULT 0,
    documents_failed INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created ON scraping_jobs(created_at DESC);

-- 4. scraping_schedule table
CREATE TABLE IF NOT EXISTS scraping_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section VARCHAR(50) NOT NULL UNIQUE,
    cron_expression VARCHAR(50) NOT NULL DEFAULT '0 0 6 * * *',
    enabled BOOLEAN NOT NULL DEFAULT true,
    last_execution_at TIMESTAMP,
    last_status VARCHAR(20),
    next_execution_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Seed default schedule for 5 sections
INSERT INTO scraping_schedule (section, cron_expression, enabled) VALUES
    ('REGISTRO_OFICIAL', '0 0 6 * * *', true),
    ('SUPLEMENTO', '0 10 6 * * *', true),
    ('EDICION_ESPECIAL', '0 20 6 * * *', true),
    ('EDICION_CONSTITUCIONAL', '0 30 6 * * *', true),
    ('EDICION_JURIDICA', '0 40 6 * * *', true)
ON CONFLICT (section) DO NOTHING;

-- Seed default legal sources
INSERT INTO legal_sources (name, type, base_url, description) VALUES
    ('Registro Oficial', 'REGISTRO_OFICIAL', 'https://www.registroficial.gob.ec', 'Publicaciones diarias del Registro Oficial del Ecuador'),
    ('Asamblea Nacional', 'ASAMBLEA', 'https://www.asambleanacional.gob.ec', 'Leyes vigentes publicadas por la Asamblea Nacional'),
    ('Presidencia de la Republica', 'PRESIDENCIA', 'https://www.presidencia.gob.ec', 'Normativa publicada por la Presidencia'),
    ('Ministerios', 'MINISTERIO', NULL, 'PDFs de codigos publicados por ministerios sectoriales'),
    ('Corte Constitucional', 'CORTE', 'https://www.corteconstitucional.gob.ec', 'Sistema ESACC de la Corte Constitucional')
ON CONFLICT DO NOTHING;
```

Write this file to `backend/src/main/resources/db/migration/V1__scraping_tables.sql`.

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/resources/db/migration/V1__scraping_tables.sql
git commit -m "feat: add SQL migration for scraping tables and legal_documents extensions"
```

---

## Task 2: Add Jsoup Dependency

**Files:**
- Modify: `backend/pom.xml`

- [ ] **Step 1: Add Jsoup dependency to pom.xml**

Add after the Apache POI dependency block:

```xml
        <!-- Jsoup for HTML parsing (scraping) -->
        <dependency>
            <groupId>org.jsoup</groupId>
            <artifactId>jsoup</artifactId>
            <version>1.18.3</version>
        </dependency>
```

- [ ] **Step 2: Verify Maven resolves the dependency**

Run: `cd backend && mvn dependency:resolve -q`
Expected: Build success, no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/pom.xml
git commit -m "feat: add Jsoup dependency for HTML scraping"
```

---

## Task 3: New JPA Entities

**Files:**
- Create: `backend/src/main/java/com/legaltech/infrastructure/persistence/entity/LegalSourceEntity.java`
- Create: `backend/src/main/java/com/legaltech/infrastructure/persistence/entity/ScrapingJobEntity.java`
- Create: `backend/src/main/java/com/legaltech/infrastructure/persistence/entity/ScrapingScheduleEntity.java`

- [ ] **Step 1: Create LegalSourceEntity**

```java
package com.legaltech.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "legal_sources")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LegalSourceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private String id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(name = "base_url", length = 500)
    private String baseUrl;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
```

- [ ] **Step 2: Create ScrapingJobEntity**

```java
package com.legaltech.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "scraping_jobs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScrapingJobEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private String id;

    @Column(name = "source_id")
    private String sourceId;

    @Column(name = "job_type", nullable = false, length = 50)
    private String jobType;

    @Column(length = 50)
    private String section;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "documents_found")
    @Builder.Default
    private Integer documentsFound = 0;

    @Column(name = "documents_downloaded")
    @Builder.Default
    private Integer documentsDownloaded = 0;

    @Column(name = "documents_processed")
    @Builder.Default
    private Integer documentsProcessed = 0;

    @Column(name = "documents_failed")
    @Builder.Default
    private Integer documentsFailed = 0;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    @Column(name = "max_retries")
    @Builder.Default
    private Integer maxRetries = 3;

    @Column(name = "next_retry_at")
    private Instant nextRetryAt;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
```

- [ ] **Step 3: Create ScrapingScheduleEntity**

```java
package com.legaltech.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "scraping_schedule")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScrapingScheduleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private String id;

    @Column(nullable = false, unique = true, length = 50)
    private String section;

    @Column(name = "cron_expression", nullable = false, length = 50)
    @Builder.Default
    private String cronExpression = "0 0 6 * * *";

    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    @Column(name = "last_execution_at")
    private Instant lastExecutionAt;

    @Column(name = "last_status", length = 20)
    private String lastStatus;

    @Column(name = "next_execution_at")
    private Instant nextExecutionAt;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/legaltech/infrastructure/persistence/entity/LegalSourceEntity.java
git add backend/src/main/java/com/legaltech/infrastructure/persistence/entity/ScrapingJobEntity.java
git add backend/src/main/java/com/legaltech/infrastructure/persistence/entity/ScrapingScheduleEntity.java
git commit -m "feat: add JPA entities for legal_sources, scraping_jobs, scraping_schedule"
```

---

## Task 4: Extend LegalDocumentEntity + New Repositories

**Files:**
- Modify: `backend/src/main/java/com/legaltech/infrastructure/persistence/entity/LegalDocumentEntity.java`
- Modify: `backend/src/main/java/com/legaltech/infrastructure/persistence/repository/JpaLegalDocumentRepository.java`
- Create: `backend/src/main/java/com/legaltech/infrastructure/persistence/repository/JpaLegalSourceRepository.java`
- Create: `backend/src/main/java/com/legaltech/infrastructure/persistence/repository/JpaScrapingJobRepository.java`
- Create: `backend/src/main/java/com/legaltech/infrastructure/persistence/repository/JpaScrapingScheduleRepository.java`

- [ ] **Step 1: Add new columns to LegalDocumentEntity**

Add these fields after the existing `updatedAt` field (before the closing `}`):

```java
    @Column(name = "document_type", length = 50)
    private String documentType;

    @Column(length = 20)
    private String abbreviation;

    @Column(name = "edition_number", length = 50)
    private String editionNumber;

    @Column(name = "publication_date")
    private java.time.LocalDate publicationDate;

    @Column(name = "source_id")
    private String sourceId;

    @Column(name = "source_url", length = 1000)
    private String sourceUrl;

    @Column(length = 100)
    private String version;

    private Integer priority;

    @Column(name = "page_count")
    private Integer pageCount;
```

- [ ] **Step 2: Add query methods to JpaLegalDocumentRepository**

Replace the entire file:

```java
package com.legaltech.infrastructure.persistence.repository;

import com.legaltech.infrastructure.persistence.entity.LegalDocumentEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JpaLegalDocumentRepository extends JpaRepository<LegalDocumentEntity, String> {

    Page<LegalDocumentEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Optional<LegalDocumentEntity> findByAbbreviation(String abbreviation);

    Optional<LegalDocumentEntity> findByEditionNumberAndDocumentType(String editionNumber, String documentType);

    List<LegalDocumentEntity> findByDocumentTypeIn(List<String> types);

    List<LegalDocumentEntity> findByAbbreviationIsNotNullOrderByPriorityAsc();
}
```

- [ ] **Step 3: Create JpaLegalSourceRepository**

```java
package com.legaltech.infrastructure.persistence.repository;

import com.legaltech.infrastructure.persistence.entity.LegalSourceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface JpaLegalSourceRepository extends JpaRepository<LegalSourceEntity, String> {

    Optional<LegalSourceEntity> findByType(String type);
}
```

- [ ] **Step 4: Create JpaScrapingJobRepository**

```java
package com.legaltech.infrastructure.persistence.repository;

import com.legaltech.infrastructure.persistence.entity.ScrapingJobEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JpaScrapingJobRepository extends JpaRepository<ScrapingJobEntity, String> {

    Page<ScrapingJobEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<ScrapingJobEntity> findByStatus(String status);

    List<ScrapingJobEntity> findByJobTypeAndStatusIn(String jobType, List<String> statuses);
}
```

- [ ] **Step 5: Create JpaScrapingScheduleRepository**

```java
package com.legaltech.infrastructure.persistence.repository;

import com.legaltech.infrastructure.persistence.entity.ScrapingScheduleEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JpaScrapingScheduleRepository extends JpaRepository<ScrapingScheduleEntity, String> {

    Optional<ScrapingScheduleEntity> findBySection(String section);

    List<ScrapingScheduleEntity> findByEnabledTrue();
}
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/legaltech/infrastructure/persistence/entity/LegalDocumentEntity.java
git add backend/src/main/java/com/legaltech/infrastructure/persistence/repository/
git commit -m "feat: extend LegalDocumentEntity and add scraping repositories"
```

---

## Task 5: Legal Catalog Configuration

**Files:**
- Create: `backend/src/main/java/com/legaltech/application/usecase/admin/LegalCatalogConfig.java`

This is the static catalog of 65 legal codes with their metadata and known download URLs.

- [ ] **Step 1: Create LegalCatalogConfig**

```java
package com.legaltech.application.usecase.admin;

import java.util.List;

public class LegalCatalogConfig {

    public record LegalCode(String abbreviation, String name, int priority, String sourceUrl) {}

    public static final List<LegalCode> CATALOG = List.of(
        // Priority 1 - Fundamental Codes
        new LegalCode("CRE", "Constitucion de la Republica del Ecuador", 1,
            "https://www.defensa.gob.ec/wp-content/uploads/downloads/2021/02/Constitucion-de-la-Republica-del-Ecuador_act_ene-2021.pdf"),
        new LegalCode("COIP", "Codigo Organico Integral Penal", 1,
            "https://www.presidencia.gob.ec/wp-content/uploads/2024/04/CODIGO_ORGANICO_INTEGRAL_PENAL_COIP.pdf"),
        new LegalCode("COGEP", "Codigo Organico General de Procesos", 1,
            "https://www.defensa.gob.ec/wp-content/uploads/downloads/2021/03/COGEP_act_feb-2021.pdf"),
        new LegalCode("CC", "Codigo Civil", 1,
            "https://www.registrocivil.gob.ec/wp-content/uploads/downloads/2017/05/Codificacion_del_Codigo_Civil.pdf"),
        new LegalCode("CT", "Codigo del Trabajo", 1,
            "https://www.trabajo.gob.ec/wp-content/uploads/downloads/2012/11/C%C3%B3digo-de-Tabajo-PDF.pdf"),
        new LegalCode("COFJ", "Codigo Organico de la Funcion Judicial", 1,
            "https://www.funcionjudicial.gob.ec/pdf/CODIGO%20ORGANICO%20DE%20LA%20FUNCION%20JUDICIAL.pdf"),
        new LegalCode("COA", "Codigo Organico Administrativo", 1,
            "https://www.gobiernoelectronico.gob.ec/wp-content/uploads/2020/11/COA.pdf"),

        // Priority 2 - High-Consultation
        new LegalCode("COOTAD", "Codigo Organico de Organizacion Territorial Autonomia y Descentralizacion", 2,
            "https://www.defensa.gob.ec/wp-content/uploads/downloads/2021/03/COOTAD_act_feb-2021.pdf"),
        new LegalCode("CTrib", "Codigo Tributario", 2,
            "https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/435ca1c0-a5a4-4789-b698-b3d93dcac5bf/CODIGO_TRIBUTARIO.pdf"),
        new LegalCode("CCom", "Codigo de Comercio", 2,
            "https://www.supercias.gob.ec/bd_supercias/descargas/ss/20140717102751.pdf"),
        new LegalCode("CNA", "Codigo de la Ninez y Adolescencia", 2,
            "https://www.igualdad.gob.ec/wp-content/uploads/downloads/2017/11/codigo_ninezyadolescencia.pdf"),
        new LegalCode("COMF", "Codigo Organico Monetario y Financiero", 2,
            "https://www.seps.gob.ec/wp-content/uploads/CODIGO-ORGANICO-MONETARIO-Y-FINANCIERO.pdf"),
        new LegalCode("COPCI", "Codigo Organico de la Produccion Comercio e Inversiones", 2,
            "https://www.enamiep.gob.ec/wp-content/uploads/downloads/2016/07/Codigo-Organico-de-la-Produccion.pdf"),
        new LegalCode("LSS", "Ley de Seguridad Social", 2,
            "https://www.iess.gob.ec/documents/10162/33703/LEY+DE+SEGURIDAD+SOCIAL.pdf"),
        new LegalCode("LOSEP", "Ley Organica del Servicio Publico", 2,
            "https://www.defensa.gob.ec/wp-content/uploads/downloads/2021/03/LOSEP_act_feb-2021.pdf"),
        new LegalCode("LC", "Ley de Companias", 2,
            "https://www.supercias.gob.ec/bd_supercias/descargas/ss/20111028102451.pdf"),
        new LegalCode("LRTI", "Ley de Regimen Tributario Interno", 2,
            "https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/304f1cf5-5cb0-4886-bba8-5e2be620ae44/LEY_DE_REGIMEN_TRIBUTARIO_INTERNO.pdf"),
        new LegalCode("LOGJCC", "Ley Organica de Garantias Jurisdiccionales y Control Constitucional", 2,
            "https://www.corteconstitucional.gob.ec/wp-content/uploads/2022/01/Ley_organica_de_garantias_jurisdiccionales_y_control_constitucional.pdf"),
        new LegalCode("LODC", "Ley Organica de Defensa del Consumidor", 2,
            "https://www.dpe.gob.ec/wp-content/dpetransparencia2012/literala/BaseLegalQueRigeLaInstitucion/LeyOrganicadelConsumidor.pdf"),
        new LegalCode("LOSNCP", "Ley Organica del Sistema Nacional de Contratacion Publica", 2,
            "https://www.defensa.gob.ec/wp-content/uploads/downloads/2021/03/Ley-Organica-del-Sistema-Nacional-de-Contratacion-Publica_act_feb-2021.pdf"),

        // Priority 3 - Sectoral Laws
        new LegalCode("LOTTTSV", "Ley Organica de Transporte Terrestre Transito y Seguridad Vial", 3,
            "https://www.emov.gob.ec/wp-content/uploads/2022/09/LEY-ORGANICA-DE-TRANSPORTE-TERESTRE-TRANSITO-Y-SEGURIDAD-VIAL.pdf"),
        new LegalCode("LOMH", "Ley Organica de Movilidad Humana", 3,
            "https://www.cancilleria.gob.ec/wp-content/uploads/2022/06/2021.05.14_ley_organica_de_movilidad_humana_-_lomh.pdf"),
        new LegalCode("LOEI", "Ley Organica de Educacion Intercultural", 3,
            "https://educacion.gob.ec/wp-content/uploads/downloads/2017/05/Ley-Organica-Educacion-Intercultural-Codificada.pdf"),
        new LegalCode("LOES", "Ley Organica de Educacion Superior", 3,
            "https://www.planificacion.gob.ec/wp-content/uploads/downloads/2012/08/Ley-Org%C3%A1nica-de-Educaci%C3%B3n-Superior.pdf"),
        new LegalCode("LOS", "Ley Organica de Salud", 3,
            "https://www.salud.gob.ec/wp-content/uploads/2017/03/LEY-ORG%C3%81NICA-DE-SALUD4.pdf"),
        new LegalCode("LOC", "Ley Organica de Comunicacion", 3,
            "https://www.telecomunicaciones.gob.ec/wp-content/uploads/downloads/2013/07/Ley-Organica-de-Comunicacion.pdf"),
        new LegalCode("LOPDP", "Ley Organica de Proteccion de Datos Personales", 3,
            "https://www.telecomunicaciones.gob.ec/wp-content/uploads/2021/06/Ley-Organica-de-Datos-Personales.pdf"),
        new LegalCode("LM", "Ley de Mineria", 3,
            "https://www.oas.org/juridico/pdfs/mesicic4_ecu_mineria.pdf"),
        new LegalCode("COAm", "Codigo Organico del Ambiente", 3,
            "https://www.ambiente.gob.ec/wp-content/uploads/downloads/2018/01/CODIGO_ORGANICO_AMBIENTE.pdf"),
        new LegalCode("LORH", "Ley Organica de Recursos Hidricos Usos y Aprovechamiento del Agua", 3,
            "https://www.regulacionagua.gob.ec/wp-content/uploads/downloads/2016/03/Ley-Org%C3%A1nica-de-Recursos-H%C3%ADdricos-Usos-y-Aprovechamiento-del-Agua.pdf"),
        new LegalCode("LOTRTA", "Ley Organica de Tierras Rurales y Territorios Ancestrales", 3,
            "https://www.agricultura.gob.ec/wp-content/uploads/downloads/2016/04/Ley-Organica-de-Tierras-Rurales-y-Territorios-Ancestrales.pdf"),
        new LegalCode("CD", "Ley Organica Electoral Codigo de la Democracia", 3,
            "https://www.cne.gob.ec/wp-content/uploads/2023/08/ECLEX-PRO-PUBLICO-LEY_ORGANICA_ELECTORAL_CODIGO_DE_LA_DEMOCRACIA.pdf"),
        new LegalCode("LOEPS", "Ley Organica de Economia Popular y Solidaria", 3,
            "https://www.vicepresidencia.gob.ec/wp-content/uploads/downloads/2018/09/Ley-Orga%CC%81nica-de-Economi%CC%81a-Popular-y-Solidaria.pdf"),
        new LegalCode("LOT", "Ley Organica de Telecomunicaciones", 3,
            "https://www.telecomunicaciones.gob.ec/wp-content/uploads/downloads/2016/05/Ley-Org%C3%A1nica-de-Telecomunicaciones.pdf"),
        new LegalCode("LORCPM", "Ley Organica de Regulacion y Control del Poder de Mercado", 3,
            "https://www.scpm.gob.ec/sitio/wp-content/uploads/2019/03/LORCPM.pdf"),
        new LegalCode("LOIPEVM", "Ley Organica Integral para Prevenir y Erradicar la Violencia contra las Mujeres", 3,
            "https://www.igualdadgenero.gob.ec/wp-content/uploads/2018/11/LOIPEVM-Versi%C3%B3n-Ejecutiva.pdf"),
        new LegalCode("LOPC", "Ley Organica de Participacion Ciudadana", 3,
            "https://www.oas.org/juridico/pdfs/mesicic4_ecu_org6.pdf"),
        new LegalCode("LOCPCCS", "Ley Organica del Consejo de Participacion Ciudadana y Control Social", 3,
            "https://www.cpccs.gob.ec/wp-content/uploads/2016/12/Ley-Org-CPCCS.pdf"),
        new LegalCode("LOCGE", "Ley Organica de la Contraloria General del Estado", 3,
            "https://www.contraloria.gob.ec/WFDescarga.aspx?id=2137&tipo=tradoc"),
        new LegalCode("LOED", "Ley Organica de Extincion de Dominio", 3,
            "https://www.fielweb.com/Index.aspx?157Redirect=1&ID_ARTICULO=null"),

        // Priority 4 - Complementary
        new LegalCode("COESCOP", "Codigo Organico de las Entidades de Seguridad Ciudadana y Orden Publico", 4,
            "https://www.defensa.gob.ec/wp-content/uploads/downloads/2021/03/COESCOP_act_feb-2021.pdf"),
        new LegalCode("LOFL", "Ley Organica de la Funcion Legislativa", 4,
            "https://www.mit.gob.ec/wp-content/uploads/downloads/2021/08/LOTAIP_6_Ley-Organica-de-la-Funcion-Legislativa-2021.pdf"),
        new LegalCode("LOFTCS", "Ley Organica de la Funcion de Transparencia y Control Social", 4,
            "https://www.contraloria.gob.ec/WFDescarga.aspx?id=2137&tipo=tradoc"),
        new LegalCode("LI", "Ley de Inquilinato", 4,
            "https://www.habitatyvivienda.gob.ec/wp-content/uploads/downloads/2015/08/Ley-de-Inquilinato.pdf"),
        new LegalCode("LCE", "Ley de Comercio Electronico Firmas y Mensajes de Datos", 4,
            "https://www.telecomunicaciones.gob.ec/wp-content/uploads/downloads/2012/11/Ley-de-Comercio-Electronico-Firmas-y-Mensajes-de-Datos.pdf"),
        new LegalCode("CI", "Ley de Propiedad Intelectual Codigo Ingenios", 4,
            "http://www.sice.oas.org/int_prop/nat_leg/ecuador/l320a.asp"),
        new LegalCode("LOAM", "Ley Organica de Arbitraje y Mediacion", 4,
            "https://www.funcionjudicial.gob.ec/pdf/Ley%20de%20Arbitraje%20y%20Mediacion.pdf"),
        new LegalCode("LOEP", "Ley Organica de Empresas Publicas", 4,
            "https://www.defensa.gob.ec/wp-content/uploads/downloads/2021/03/LOEP_act_feb-2021.pdf"),
        new LegalCode("LOIP", "Ley Organica de Integridad Publica", 4,
            "https://www.cpccs.gob.ec/wp-content/uploads/2025/07/LEY-ORGANICA-DE-INTEGRIDAD-PUBLICA-LOIP.pdf"),
        new LegalCode("LOTAIP", "Ley de Transparencia y Acceso a la Informacion Publica", 4,
            "https://www.defensa.gob.ec/wp-content/uploads/downloads/2021/03/LOTAIP_act_feb-2021.pdf"),
        new LegalCode("LOPD", "Ley Organica de Personas con Discapacidad", 4,
            "https://www.consejodiscapacidades.gob.ec/wp-content/uploads/downloads/2014/02/ley_organica_discapacidades.pdf"),
        new LegalCode("LOD", "Ley Organica del Deporte Educacion Fisica y Recreacion", 4,
            "https://www.deporte.gob.ec/wp-content/uploads/downloads/2015/03/Ley-del-Deporte.pdf"),
        new LegalCode("LOCul", "Ley Organica de Cultura", 4,
            "https://www.culturaypatrimonio.gob.ec/wp-content/uploads/downloads/2017/01/Ley-Org%C3%A1nica-de-Cultura-APROBADA-Y-PUBLICADA.pdf"),
        new LegalCode("LOPIFSD", "Ley Organica de Prevencion Integral del Fenomeno Socioeconomico de las Drogas", 4,
            "https://www.controlsanitario.gob.ec/wp-content/uploads/downloads/2021/01/Ley-Organica-de-Prevencion-Integral-del-Fenomeno-Socio-Economico-de-las-drogas-y-de-regulacion-y-control-del-uso-de-sustancias-catalogadas-sujetas-a-fiscalizacion_Ley-0.pdf"),
        new LegalCode("LOREG", "Ley Organica de Regimen Especial de la Provincia de Galapagos", 4,
            "https://www.turismo.gob.ec/wp-content/uploads/2016/04/LOREG-11-06-2015.pdf"),
        new LegalCode("LOSN", "Ley Organica de Solidaridad Nacional", 4,
            "https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/5f19dc76-1ddb-4f2c-9e5e-dde86db63fd2/LEY%20ORG%C3%81NICA%20DE%20SOLIDARIDAD%20NACIONAL.pdf"),
        new LegalCode("LOI", "Ley Organica de Inteligencia", 4,
            "https://strapi.lexis.com.ec/uploads/Registro_Oficial_Ano_1_Cuarto_Suplemento_No_57_10_de_junio_de_2025_6565dee8a1.pdf"),
        new LegalCode("LOSA", "Ley Organica de Soberania Alimentaria", 4,
            "https://www.soberaniaalimentaria.gob.ec/pacha/wp-content/uploads/2011/04/LORSA.pdf"),
        new LegalCode("LOTur", "Ley Organica de Turismo", 4,
            "https://www.turismo.gob.ec/wp-content/uploads/2015/04/LEY-DE-TURISMO.pdf"),
        new LegalCode("LOSE", "Ley Organica del Servicio Exterior", 4,
            "https://www.cancilleria.gob.ec/wp-content/uploads/2014/03/ley_organica_servicio_exterior.pdf"),
        new LegalCode("LOPFP", "Ley Organica de Planificacion y Finanzas Publicas", 4,
            "https://www.finanzas.gob.ec/wp-content/uploads/downloads/2012/09/CODIGO_PLANIFICACION_FINAZAS.pdf"),
        new LegalCode("LOSNRDP", "Ley Organica del Sistema Nacional de Registro de Datos Publicos", 4,
            "https://www.registrodelapropiedad.gob.ec/wp-content/uploads/downloads/2016/02/Ley-del-sistema-de-registro-de-datos-publicos.pdf"),
        new LegalCode("LOGIDC", "Ley Organica de Gestion de la Identidad y Datos Civiles", 4,
            "https://www.registrocivil.gob.ec/wp-content/uploads/downloads/2016/03/LEY_ORGANICA_RC.pdf"),
        new LegalCode("LODESF", "Ley Organica para el Desarrollo Economico y Sostenibilidad Fiscal", 4,
            "https://www.produccion.gob.ec/wp-content/uploads/downloads/2021/12/Ley-Organica-para-el-Desarrollo-Economico-y-Sostenibilidad-Fiscal-tras-la-Pandemia-Covid-19.pdf"),
        new LegalCode("LOPSVD", "Ley Organica de Prevencion y Sancion de la Violencia en el Deporte", 4,
            "https://www.gestionderiesgos.gob.ec/wp-content/uploads/downloads/2021/07/Ley-Organica-de-Prevencion-y-Sancion-de-la-Violencia-en-el-Deporte.pdf")
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/legaltech/application/usecase/admin/LegalCatalogConfig.java
git commit -m "feat: add legal catalog with 65 Ecuadorian legal codes and source URLs"
```

---

## Task 6: BatchDocumentProcessingService

**Files:**
- Create: `backend/src/main/java/com/legaltech/application/usecase/admin/BatchDocumentProcessingService.java`

This service extends the existing `DocumentProcessingService` pattern but adds rate limiting, retry logic, and job progress tracking.

- [ ] **Step 1: Create BatchDocumentProcessingService**

```java
package com.legaltech.application.usecase.admin;

import com.legaltech.infrastructure.persistence.entity.LegalDocumentEntity;
import com.legaltech.infrastructure.persistence.entity.ScrapingJobEntity;
import com.legaltech.infrastructure.persistence.repository.JpaLegalDocumentRepository;
import com.legaltech.infrastructure.persistence.repository.JpaScrapingJobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

@Service
public class BatchDocumentProcessingService {

    private static final Logger log = LoggerFactory.getLogger(BatchDocumentProcessingService.class);
    private static final int MAX_CONCURRENT_DOWNLOADS = 3;
    private static final int EMBEDDING_DELAY_MS = 200; // ~5 req/sec
    private static final int MAX_RETRIES = 3;

    private final DocumentProcessingService documentProcessingService;
    private final JpaLegalDocumentRepository documentRepository;
    private final JpaScrapingJobRepository jobRepository;
    private final HttpClient httpClient;
    private final Semaphore downloadSemaphore = new Semaphore(MAX_CONCURRENT_DOWNLOADS);
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    public BatchDocumentProcessingService(DocumentProcessingService documentProcessingService,
                                           JpaLegalDocumentRepository documentRepository,
                                           JpaScrapingJobRepository jobRepository) {
        this.documentProcessingService = documentProcessingService;
        this.documentRepository = documentRepository;
        this.jobRepository = jobRepository;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    /**
     * Download a PDF from a URL and return the bytes.
     * Uses a semaphore to limit concurrent downloads.
     */
    public byte[] downloadPdf(String url) throws IOException, InterruptedException {
        downloadSemaphore.acquire();
        try {
            log.info("Downloading PDF from: {}", url);
            var request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(120))
                    .header("User-Agent", "LegalTech-Ecuador/1.0")
                    .GET()
                    .build();

            var response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

            if (response.statusCode() != 200) {
                throw new IOException("HTTP " + response.statusCode() + " downloading " + url);
            }

            byte[] body = response.body();
            log.info("Downloaded {} bytes from {}", body.length, url);
            return body;
        } finally {
            downloadSemaphore.release();
        }
    }

    /**
     * Download a PDF with retries and exponential backoff.
     */
    public byte[] downloadPdfWithRetry(String url) throws IOException, InterruptedException {
        int attempt = 0;
        while (true) {
            try {
                return downloadPdf(url);
            } catch (IOException e) {
                attempt++;
                if (attempt >= MAX_RETRIES) {
                    throw e;
                }
                long delay = (long) Math.pow(2, attempt) * 2000; // 2s, 8s, 32s
                log.warn("Download failed (attempt {}/{}), retrying in {}ms: {}",
                        attempt, MAX_RETRIES, delay, e.getMessage());
                Thread.sleep(delay);
            }
        }
    }

    /**
     * Process a single document: extract text, chunk, embed.
     * Delegates to existing DocumentProcessingService.
     * Adds a delay between documents to respect Gemini rate limits.
     */
    public void processDocument(LegalDocumentEntity doc, byte[] content, ScrapingJobEntity job) {
        try {
            documentProcessingService.processAsync(doc.getId(), content);

            // Wait for processing to complete (poll status)
            int maxWaitSeconds = 600; // 10 minutes max per document
            int waited = 0;
            while (waited < maxWaitSeconds) {
                Thread.sleep(2000);
                waited += 2;
                var updated = documentRepository.findById(doc.getId()).orElse(null);
                if (updated != null && ("COMPLETED".equals(updated.getStatus()) || "FAILED".equals(updated.getStatus()))) {
                    if ("COMPLETED".equals(updated.getStatus())) {
                        job.setDocumentsProcessed(job.getDocumentsProcessed() + 1);
                    } else {
                        job.setDocumentsFailed(job.getDocumentsFailed() + 1);
                    }
                    jobRepository.save(job);
                    return;
                }
            }

            // Timeout
            job.setDocumentsFailed(job.getDocumentsFailed() + 1);
            jobRepository.save(job);
            log.warn("Document {} processing timed out after {}s", doc.getId(), maxWaitSeconds);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            job.setDocumentsFailed(job.getDocumentsFailed() + 1);
            jobRepository.save(job);
        }
    }

    /**
     * Process a batch of documents asynchronously with a job tracker.
     */
    public void processBatchAsync(List<LegalDocumentEntity> documents, List<byte[]> contents, ScrapingJobEntity job) {
        executor.submit(() -> {
            job.setStatus("PROCESSING");
            job.setStartedAt(Instant.now());
            jobRepository.save(job);

            for (int i = 0; i < documents.size(); i++) {
                processDocument(documents.get(i), contents.get(i), job);
                log.info("Batch progress: {}/{} documents for job {}",
                        job.getDocumentsProcessed() + job.getDocumentsFailed(),
                        job.getDocumentsFound(), job.getId());
            }

            job.setStatus(job.getDocumentsFailed() > 0 ? "COMPLETED" : "COMPLETED");
            job.setCompletedAt(Instant.now());
            jobRepository.save(job);

            log.info("Batch job {} completed: {} processed, {} failed out of {} found",
                    job.getId(), job.getDocumentsProcessed(), job.getDocumentsFailed(), job.getDocumentsFound());
        });
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/legaltech/application/usecase/admin/BatchDocumentProcessingService.java
git commit -m "feat: add BatchDocumentProcessingService with rate limiting and retries"
```

---

## Task 7: RegistroOficialScraper

**Files:**
- Create: `backend/src/main/java/com/legaltech/application/usecase/admin/RegistroOficialScraper.java`

- [ ] **Step 1: Create RegistroOficialScraper**

```java
package com.legaltech.application.usecase.admin;

import com.legaltech.infrastructure.persistence.entity.LegalDocumentEntity;
import com.legaltech.infrastructure.persistence.entity.ScrapingJobEntity;
import com.legaltech.infrastructure.persistence.repository.JpaLegalDocumentRepository;
import com.legaltech.infrastructure.persistence.repository.JpaLegalSourceRepository;
import com.legaltech.infrastructure.persistence.repository.JpaScrapingJobRepository;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class RegistroOficialScraper {

    private static final Logger log = LoggerFactory.getLogger(RegistroOficialScraper.class);

    // Section page URLs on registroficial.gob.ec
    private static final Map<String, String> SECTION_URLS = Map.of(
        "REGISTRO_OFICIAL", "https://www.registroficial.gob.ec/245427-2/",
        "SUPLEMENTO", "https://www.registroficial.gob.ec/255776-2/",
        "EDICION_ESPECIAL", "https://www.registroficial.gob.ec/261974-2/",
        "EDICION_CONSTITUCIONAL", "https://www.registroficial.gob.ec/267099-2/",
        "EDICION_JURIDICA", "https://www.registroficial.gob.ec/266381-2/"
    );

    private static final Pattern EDITION_PATTERN = Pattern.compile("N[oº°]\\s*(\\d+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern PAGES_PATTERN = Pattern.compile("(\\d+)\\s*P[AÁ]GINAS", Pattern.CASE_INSENSITIVE);

    private final JpaLegalDocumentRepository documentRepository;
    private final JpaScrapingJobRepository jobRepository;
    private final JpaLegalSourceRepository sourceRepository;
    private final BatchDocumentProcessingService batchService;

    public RegistroOficialScraper(JpaLegalDocumentRepository documentRepository,
                                   JpaScrapingJobRepository jobRepository,
                                   JpaLegalSourceRepository sourceRepository,
                                   BatchDocumentProcessingService batchService) {
        this.documentRepository = documentRepository;
        this.jobRepository = jobRepository;
        this.sourceRepository = sourceRepository;
        this.batchService = batchService;
    }

    public record EditionInfo(String title, String editionNumber, String date, Integer pageCount, String downloadUrl) {}

    /**
     * Scrape a section of the Registro Oficial and process new editions.
     */
    public ScrapingJobEntity scrapeSection(String section) {
        String sectionUrl = SECTION_URLS.get(section);
        if (sectionUrl == null) {
            throw new IllegalArgumentException("Unknown section: " + section);
        }

        var sourceOpt = sourceRepository.findByType("REGISTRO_OFICIAL");
        String sourceId = sourceOpt.map(s -> s.getId()).orElse(null);

        var job = ScrapingJobEntity.builder()
                .sourceId(sourceId)
                .jobType("DAILY_SCRAPE")
                .section(section)
                .status("DOWNLOADING")
                .startedAt(Instant.now())
                .build();
        jobRepository.save(job);

        try {
            List<EditionInfo> editions = fetchEditions(sectionUrl);
            job.setDocumentsFound(editions.size());
            jobRepository.save(job);

            List<LegalDocumentEntity> newDocs = new ArrayList<>();
            List<byte[]> newContents = new ArrayList<>();

            for (EditionInfo edition : editions) {
                // Check if already downloaded
                if (documentRepository.findByEditionNumberAndDocumentType(
                        edition.editionNumber(), section).isPresent()) {
                    continue;
                }

                try {
                    byte[] pdfContent = batchService.downloadPdfWithRetry(edition.downloadUrl());
                    job.setDocumentsDownloaded(job.getDocumentsDownloaded() + 1);
                    jobRepository.save(job);

                    var doc = LegalDocumentEntity.builder()
                            .title(edition.title() + " " + edition.editionNumber())
                            .fileName(section.toLowerCase() + "_" + edition.editionNumber().replace(" ", "_") + ".pdf")
                            .fileType("pdf")
                            .fileSize((long) pdfContent.length)
                            .status("PENDING")
                            .documentType(section)
                            .editionNumber(edition.editionNumber())
                            .pageCount(edition.pageCount())
                            .sourceId(sourceId)
                            .sourceUrl(edition.downloadUrl())
                            .uploadedBy("SYSTEM")
                            .uploadedByEmail("scraper@legaltech.ec")
                            .build();
                    documentRepository.save(doc);

                    newDocs.add(doc);
                    newContents.add(pdfContent);

                } catch (Exception e) {
                    log.warn("Failed to download edition {}: {}", edition.editionNumber(), e.getMessage());
                    job.setDocumentsFailed(job.getDocumentsFailed() + 1);
                    jobRepository.save(job);
                }
            }

            if (!newDocs.isEmpty()) {
                batchService.processBatchAsync(newDocs, newContents, job);
            } else {
                job.setStatus("COMPLETED");
                job.setCompletedAt(Instant.now());
                jobRepository.save(job);
                log.info("No new editions found for section {}", section);
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

    /**
     * Fetch edition list from a section page using Jsoup.
     */
    List<EditionInfo> fetchEditions(String sectionUrl) throws IOException {
        Document doc = Jsoup.connect(sectionUrl)
                .userAgent("LegalTech-Ecuador/1.0")
                .timeout(30_000)
                .get();

        List<EditionInfo> editions = new ArrayList<>();

        // The page has h4 headings for edition type and number,
        // static text for dates and page counts,
        // and "Descargar" links for PDFs
        var links = doc.select("a:contains(Descargar)");

        for (Element link : links) {
            String downloadUrl = link.absUrl("href");
            if (downloadUrl.isEmpty()) continue;

            // Walk up to find the parent container with edition metadata
            Element container = link.parent();
            while (container != null && !container.tagName().equals("div")) {
                container = container.parent();
            }
            if (container == null) continue;

            String containerText = container.text();

            // Extract edition number
            String editionNumber = "";
            Matcher edMatcher = EDITION_PATTERN.matcher(containerText);
            if (edMatcher.find()) {
                editionNumber = "No. " + edMatcher.group(1);
            }

            // Extract page count
            Integer pageCount = null;
            Matcher pgMatcher = PAGES_PATTERN.matcher(containerText);
            if (pgMatcher.find()) {
                pageCount = Integer.parseInt(pgMatcher.group(1));
            }

            // Extract title from h4 elements
            String title = "Registro Oficial";
            var h4s = container.select("h4");
            if (!h4s.isEmpty()) {
                title = h4s.first().text();
            }

            // Extract date text
            String date = "";
            // Date is usually in text nodes like "Viernes, 10 Abril 2026"

            if (!editionNumber.isEmpty()) {
                editions.add(new EditionInfo(title, editionNumber, date, pageCount, downloadUrl));
            }
        }

        log.info("Found {} editions on page {}", editions.size(), sectionUrl);
        return editions;
    }

    public Set<String> getAvailableSections() {
        return SECTION_URLS.keySet();
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/legaltech/application/usecase/admin/RegistroOficialScraper.java
git commit -m "feat: add RegistroOficialScraper for registroficial.gob.ec"
```

---

## Task 8: InitialLoadService

**Files:**
- Create: `backend/src/main/java/com/legaltech/application/usecase/admin/InitialLoadService.java`

- [ ] **Step 1: Create InitialLoadService**

```java
package com.legaltech.application.usecase.admin;

import com.legaltech.infrastructure.persistence.entity.LegalDocumentEntity;
import com.legaltech.infrastructure.persistence.entity.ScrapingJobEntity;
import com.legaltech.infrastructure.persistence.repository.JpaLegalDocumentRepository;
import com.legaltech.infrastructure.persistence.repository.JpaLegalSourceRepository;
import com.legaltech.infrastructure.persistence.repository.JpaScrapingJobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

@Service
public class InitialLoadService {

    private static final Logger log = LoggerFactory.getLogger(InitialLoadService.class);

    private final JpaLegalDocumentRepository documentRepository;
    private final JpaScrapingJobRepository jobRepository;
    private final JpaLegalSourceRepository sourceRepository;
    private final BatchDocumentProcessingService batchService;
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    public InitialLoadService(JpaLegalDocumentRepository documentRepository,
                               JpaScrapingJobRepository jobRepository,
                               JpaLegalSourceRepository sourceRepository,
                               BatchDocumentProcessingService batchService) {
        this.documentRepository = documentRepository;
        this.jobRepository = jobRepository;
        this.sourceRepository = sourceRepository;
        this.batchService = batchService;
    }

    /**
     * Start the initial load of all 65 legal codes.
     * Skips codes that are already loaded (by abbreviation).
     * Returns the job entity for tracking.
     */
    public ScrapingJobEntity startInitialLoad() {
        // Check if there's already a running initial load
        var running = jobRepository.findByJobTypeAndStatusIn("INITIAL_LOAD",
                List.of("PENDING", "DOWNLOADING", "PROCESSING"));
        if (!running.isEmpty()) {
            log.warn("Initial load already in progress: {}", running.get(0).getId());
            return running.get(0);
        }

        var job = ScrapingJobEntity.builder()
                .jobType("INITIAL_LOAD")
                .status("PENDING")
                .documentsFound(LegalCatalogConfig.CATALOG.size())
                .build();
        jobRepository.save(job);

        executor.submit(() -> executeInitialLoad(job));

        return job;
    }

    /**
     * Start initial load for a specific priority level only.
     */
    public ScrapingJobEntity startInitialLoadByPriority(int priority) {
        var codes = LegalCatalogConfig.CATALOG.stream()
                .filter(c -> c.priority() == priority)
                .toList();

        var job = ScrapingJobEntity.builder()
                .jobType("INITIAL_LOAD")
                .section("PRIORITY_" + priority)
                .status("PENDING")
                .documentsFound(codes.size())
                .build();
        jobRepository.save(job);

        executor.submit(() -> executeLoad(job, codes));

        return job;
    }

    private void executeInitialLoad(ScrapingJobEntity job) {
        executeLoad(job, LegalCatalogConfig.CATALOG);
    }

    private void executeLoad(ScrapingJobEntity job, List<LegalCatalogConfig.LegalCode> codes) {
        job.setStatus("DOWNLOADING");
        job.setStartedAt(Instant.now());
        jobRepository.save(job);

        var sourceOpt = sourceRepository.findByType("MINISTERIO");
        String sourceId = sourceOpt.map(s -> s.getId()).orElse(null);

        List<LegalDocumentEntity> newDocs = new ArrayList<>();
        List<byte[]> newContents = new ArrayList<>();

        for (var code : codes) {
            // Skip if already loaded
            if (documentRepository.findByAbbreviation(code.abbreviation()).isPresent()) {
                log.info("Skipping already loaded code: {} ({})", code.abbreviation(), code.name());
                continue;
            }

            try {
                byte[] pdfContent = batchService.downloadPdfWithRetry(code.sourceUrl());
                job.setDocumentsDownloaded(job.getDocumentsDownloaded() + 1);
                jobRepository.save(job);

                String docType = code.priority() <= 2 ? "CODIGO" : "LEY_ORGANICA";

                var doc = LegalDocumentEntity.builder()
                        .title(code.name())
                        .fileName(code.abbreviation().toLowerCase() + ".pdf")
                        .fileType("pdf")
                        .fileSize((long) pdfContent.length)
                        .status("PENDING")
                        .documentType(docType)
                        .abbreviation(code.abbreviation())
                        .priority(code.priority())
                        .sourceId(sourceId)
                        .sourceUrl(code.sourceUrl())
                        .version("consolidada")
                        .uploadedBy("SYSTEM")
                        .uploadedByEmail("initial-load@legaltech.ec")
                        .build();
                documentRepository.save(doc);

                newDocs.add(doc);
                newContents.add(pdfContent);

                log.info("Downloaded code {}/{}: {} ({})",
                        job.getDocumentsDownloaded(), codes.size(), code.abbreviation(), code.name());

            } catch (Exception e) {
                log.error("Failed to download code {} ({}): {}",
                        code.abbreviation(), code.name(), e.getMessage());
                job.setDocumentsFailed(job.getDocumentsFailed() + 1);
                jobRepository.save(job);
            }
        }

        if (!newDocs.isEmpty()) {
            batchService.processBatchAsync(newDocs, newContents, job);
        } else {
            job.setStatus("COMPLETED");
            job.setCompletedAt(Instant.now());
            jobRepository.save(job);
            log.info("Initial load complete - all codes already loaded or all failed");
        }
    }

    /**
     * Get the status of all 65 codes: which are loaded, which are pending.
     */
    public List<Map<String, Object>> getCatalogStatus() {
        return LegalCatalogConfig.CATALOG.stream().map(code -> {
            var existing = documentRepository.findByAbbreviation(code.abbreviation());
            Map<String, Object> status = new java.util.LinkedHashMap<>();
            status.put("abbreviation", code.abbreviation());
            status.put("name", code.name());
            status.put("priority", code.priority());
            status.put("sourceUrl", code.sourceUrl());
            if (existing.isPresent()) {
                var doc = existing.get();
                status.put("loaded", true);
                status.put("documentId", doc.getId());
                status.put("status", doc.getStatus());
                status.put("totalChunks", doc.getTotalChunks());
                status.put("loadedAt", doc.getCreatedAt().toString());
            } else {
                status.put("loaded", false);
                status.put("documentId", null);
                status.put("status", "NOT_LOADED");
                status.put("totalChunks", 0);
                status.put("loadedAt", null);
            }
            return status;
        }).collect(Collectors.toList());
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/legaltech/application/usecase/admin/InitialLoadService.java
git commit -m "feat: add InitialLoadService for 65 legal codes bulk download"
```

---

## Task 9: ScrapingSchedulerService

**Files:**
- Create: `backend/src/main/java/com/legaltech/application/usecase/admin/ScrapingSchedulerService.java`

- [ ] **Step 1: Create ScrapingSchedulerService**

```java
package com.legaltech.application.usecase.admin;

import com.legaltech.infrastructure.persistence.repository.JpaScrapingScheduleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

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

    /**
     * Check every minute if any scheduled scraping is due.
     */
    @Scheduled(fixedRate = 60_000)
    public void checkSchedule() {
        var schedules = scheduleRepository.findByEnabledTrue();
        var now = Instant.now();

        for (var schedule : schedules) {
            if (schedule.getNextExecutionAt() != null && schedule.getNextExecutionAt().isBefore(now)) {
                log.info("Running scheduled scrape for section: {}", schedule.getSection());
                try {
                    var job = scraper.scrapeSection(schedule.getSection());
                    schedule.setLastExecutionAt(now);
                    schedule.setLastStatus(job.getStatus());
                    schedule.setNextExecutionAt(now.plus(24, ChronoUnit.HOURS));
                    schedule.setUpdatedAt(now);
                    scheduleRepository.save(schedule);
                } catch (Exception e) {
                    log.error("Scheduled scrape failed for {}: {}", schedule.getSection(), e.getMessage());
                    schedule.setLastExecutionAt(now);
                    schedule.setLastStatus("FAILED");
                    schedule.setNextExecutionAt(now.plus(24, ChronoUnit.HOURS));
                    schedule.setUpdatedAt(now);
                    scheduleRepository.save(schedule);
                }
            }
        }
    }

    /**
     * Initialize schedule next_execution_at if null (first run after deployment).
     */
    @Scheduled(initialDelay = 10_000, fixedRate = Long.MAX_VALUE)
    public void initializeSchedules() {
        var schedules = scheduleRepository.findByEnabledTrue();
        var now = Instant.now();

        for (var schedule : schedules) {
            if (schedule.getNextExecutionAt() == null) {
                // Set next execution to tomorrow at 6AM (approximate)
                schedule.setNextExecutionAt(now.plus(24, ChronoUnit.HOURS));
                schedule.setUpdatedAt(now);
                scheduleRepository.save(schedule);
                log.info("Initialized schedule for {}: next execution at {}",
                        schedule.getSection(), schedule.getNextExecutionAt());
            }
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/legaltech/application/usecase/admin/ScrapingSchedulerService.java
git commit -m "feat: add ScrapingSchedulerService for daily automated scraping"
```

---

## Task 10: AdminScrapingController

**Files:**
- Create: `backend/src/main/java/com/legaltech/infrastructure/web/controller/admin/AdminScrapingController.java`

- [ ] **Step 1: Create AdminScrapingController**

```java
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
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/scraping")
public class AdminScrapingController {

    private final InitialLoadService initialLoadService;
    private final RegistroOficialScraper scraper;
    private final JpaScrapingJobRepository jobRepository;
    private final JpaScrapingScheduleRepository scheduleRepository;
    private final AuditService auditService;

    public AdminScrapingController(InitialLoadService initialLoadService,
                                    RegistroOficialScraper scraper,
                                    JpaScrapingJobRepository jobRepository,
                                    JpaScrapingScheduleRepository scheduleRepository,
                                    AuditService auditService) {
        this.initialLoadService = initialLoadService;
        this.scraper = scraper;
        this.jobRepository = jobRepository;
        this.scheduleRepository = scheduleRepository;
        this.auditService = auditService;
    }

    @GetMapping("/status")
    public Map<String, Object> getStatus() {
        var jobs = jobRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 5));
        var running = jobRepository.findByStatus("PROCESSING");
        var schedules = scheduleRepository.findAll();

        return Map.of(
            "runningJobs", running.size(),
            "recentJobs", jobs.getContent().stream().map(this::jobToMap).toList(),
            "schedules", schedules.stream().map(this::scheduleToMap).toList()
        );
    }

    @GetMapping("/jobs")
    public Map<String, Object> getJobs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = jobRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
        return Map.of(
            "content", result.getContent().stream().map(this::jobToMap).toList(),
            "totalElements", result.getTotalElements(),
            "totalPages", result.getTotalPages(),
            "page", result.getNumber()
        );
    }

    @GetMapping("/jobs/{id}")
    public Map<String, Object> getJob(@PathVariable String id) {
        var job = jobRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return jobToMap(job);
    }

    @PostMapping("/initial-load")
    public Map<String, Object> triggerInitialLoad(@AuthenticationPrincipal Jwt admin) {
        var job = initialLoadService.startInitialLoad();
        auditService.log(admin, "INITIAL_LOAD_STARTED", "ScrapingJob", job.getId(),
                "Initial load of 65 legal codes started");
        return jobToMap(job);
    }

    @PostMapping("/initial-load/priority/{priority}")
    public Map<String, Object> triggerInitialLoadByPriority(
            @PathVariable int priority,
            @AuthenticationPrincipal Jwt admin) {
        if (priority < 1 || priority > 4) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Priority must be 1-4");
        }
        var job = initialLoadService.startInitialLoadByPriority(priority);
        auditService.log(admin, "INITIAL_LOAD_STARTED", "ScrapingJob", job.getId(),
                "Initial load priority " + priority + " started");
        return jobToMap(job);
    }

    @PostMapping("/run/{section}")
    public Map<String, Object> triggerScrape(
            @PathVariable String section,
            @AuthenticationPrincipal Jwt admin) {
        if (!scraper.getAvailableSections().contains(section)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid section. Available: " + scraper.getAvailableSections());
        }
        var job = scraper.scrapeSection(section);
        auditService.log(admin, "SCRAPE_STARTED", "ScrapingJob", job.getId(),
                "Manual scrape for section: " + section);
        return jobToMap(job);
    }

    @GetMapping("/catalog")
    public List<Map<String, Object>> getCatalog() {
        return initialLoadService.getCatalogStatus();
    }

    @GetMapping("/schedule")
    public List<Map<String, Object>> getSchedule() {
        return scheduleRepository.findAll().stream().map(this::scheduleToMap).toList();
    }

    @PutMapping("/schedule/{section}")
    public Map<String, Object> updateSchedule(
            @PathVariable String section,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal Jwt admin) {
        var schedule = scheduleRepository.findBySection(section)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (body.containsKey("enabled")) {
            schedule.setEnabled((Boolean) body.get("enabled"));
        }
        if (body.containsKey("cronExpression")) {
            schedule.setCronExpression((String) body.get("cronExpression"));
        }
        schedule.setUpdatedAt(Instant.now());
        scheduleRepository.save(schedule);

        auditService.log(admin, "SCHEDULE_UPDATED", "ScrapingSchedule", schedule.getId(),
                "Updated schedule for " + section);

        return scheduleToMap(schedule);
    }

    private Map<String, Object> jobToMap(ScrapingJobEntity job) {
        return Map.ofEntries(
            Map.entry("id", job.getId()),
            Map.entry("jobType", job.getJobType()),
            Map.entry("section", job.getSection() != null ? job.getSection() : ""),
            Map.entry("status", job.getStatus()),
            Map.entry("documentsFound", job.getDocumentsFound()),
            Map.entry("documentsDownloaded", job.getDocumentsDownloaded()),
            Map.entry("documentsProcessed", job.getDocumentsProcessed()),
            Map.entry("documentsFailed", job.getDocumentsFailed()),
            Map.entry("startedAt", job.getStartedAt() != null ? job.getStartedAt().toString() : ""),
            Map.entry("completedAt", job.getCompletedAt() != null ? job.getCompletedAt().toString() : ""),
            Map.entry("errorMessage", job.getErrorMessage() != null ? job.getErrorMessage() : ""),
            Map.entry("createdAt", job.getCreatedAt().toString())
        );
    }

    private Map<String, Object> scheduleToMap(ScrapingScheduleEntity s) {
        return Map.ofEntries(
            Map.entry("id", s.getId()),
            Map.entry("section", s.getSection()),
            Map.entry("cronExpression", s.getCronExpression()),
            Map.entry("enabled", s.getEnabled()),
            Map.entry("lastExecutionAt", s.getLastExecutionAt() != null ? s.getLastExecutionAt().toString() : ""),
            Map.entry("lastStatus", s.getLastStatus() != null ? s.getLastStatus() : ""),
            Map.entry("nextExecutionAt", s.getNextExecutionAt() != null ? s.getNextExecutionAt().toString() : "")
        );
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/legaltech/infrastructure/web/controller/admin/AdminScrapingController.java
git commit -m "feat: add AdminScrapingController with endpoints for scraping management"
```

---

## Task 11: Admin Dashboard - Types and API Integration

**Files:**
- Create: `admin/src/domain/entities/scraping.ts`
- Modify: `admin/src/infrastructure/api/endpoints.ts`
- Modify: `admin/src/infrastructure/query/keys.ts`
- Create: `admin/src/infrastructure/query/hooks/use-scraping.ts`

- [ ] **Step 1: Create scraping TypeScript types**

```typescript
// admin/src/domain/entities/scraping.ts

export type JobStatus = "PENDING" | "DOWNLOADING" | "PROCESSING" | "COMPLETED" | "FAILED" | "PAUSED";

export interface ScrapingJob {
  id: string;
  jobType: string;
  section: string;
  status: JobStatus;
  documentsFound: number;
  documentsDownloaded: number;
  documentsProcessed: number;
  documentsFailed: number;
  startedAt: string;
  completedAt: string;
  errorMessage: string;
  createdAt: string;
}

export interface ScrapingSchedule {
  id: string;
  section: string;
  cronExpression: string;
  enabled: boolean;
  lastExecutionAt: string;
  lastStatus: string;
  nextExecutionAt: string;
}

export interface CatalogEntry {
  abbreviation: string;
  name: string;
  priority: number;
  sourceUrl: string;
  loaded: boolean;
  documentId: string | null;
  status: string;
  totalChunks: number;
  loadedAt: string | null;
}

export interface ScrapingStatus {
  runningJobs: number;
  recentJobs: ScrapingJob[];
  schedules: ScrapingSchedule[];
}
```

- [ ] **Step 2: Add scraping endpoints**

Add to `admin/src/infrastructure/api/endpoints.ts` before the closing `} as const;`:

```typescript
  // Scraping
  scrapingStatus: `${BASE}/admin/scraping/status`,
  scrapingJobs: `${BASE}/admin/scraping/jobs`,
  scrapingJobDetail: (id: string) => `${BASE}/admin/scraping/jobs/${id}`,
  scrapingInitialLoad: `${BASE}/admin/scraping/initial-load`,
  scrapingInitialLoadPriority: (priority: number) => `${BASE}/admin/scraping/initial-load/priority/${priority}`,
  scrapingRun: (section: string) => `${BASE}/admin/scraping/run/${section}`,
  scrapingCatalog: `${BASE}/admin/scraping/catalog`,
  scrapingSchedule: `${BASE}/admin/scraping/schedule`,
  scrapingScheduleUpdate: (section: string) => `${BASE}/admin/scraping/schedule/${section}`,
```

- [ ] **Step 3: Add scraping query keys**

Add to `admin/src/infrastructure/query/keys.ts` inside the `queryKeys` object:

```typescript
  scraping: {
    status: ["scraping", "status"] as const,
    jobs: (params: Params) => ["scraping", "jobs", params] as const,
    catalog: ["scraping", "catalog"] as const,
    schedule: ["scraping", "schedule"] as const,
  },
```

- [ ] **Step 4: Create scraping React Query hooks**

```typescript
// admin/src/infrastructure/query/hooks/use-scraping.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/infrastructure/api/api-client";
import { ENDPOINTS } from "@/infrastructure/api/endpoints";
import { queryKeys } from "@/infrastructure/query/keys";

export function useScrapingStatus() {
  return useQuery({
    queryKey: queryKeys.scraping.status,
    queryFn: async () => {
      const { data } = await apiClient.get(ENDPOINTS.scrapingStatus);
      return data;
    },
    refetchInterval: 5000,
  });
}

export function useScrapingJobs(page: number = 0) {
  return useQuery({
    queryKey: queryKeys.scraping.jobs({ page }),
    queryFn: async () => {
      const { data } = await apiClient.get(ENDPOINTS.scrapingJobs, {
        params: { page, size: 20 },
      });
      return data;
    },
    refetchInterval: 5000,
  });
}

export function useLegalCatalog() {
  return useQuery({
    queryKey: queryKeys.scraping.catalog,
    queryFn: async () => {
      const { data } = await apiClient.get(ENDPOINTS.scrapingCatalog);
      return data;
    },
  });
}

export function useScrapingSchedule() {
  return useQuery({
    queryKey: queryKeys.scraping.schedule,
    queryFn: async () => {
      const { data } = await apiClient.get(ENDPOINTS.scrapingSchedule);
      return data;
    },
  });
}

export function useTriggerInitialLoad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (priority?: number) => {
      const url = priority
        ? ENDPOINTS.scrapingInitialLoadPriority(priority)
        : ENDPOINTS.scrapingInitialLoad;
      const { data } = await apiClient.post(url);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping"] });
    },
  });
}

export function useTriggerScrape() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (section: string) => {
      const { data } = await apiClient.post(ENDPOINTS.scrapingRun(section));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping"] });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ section, enabled, cronExpression }: {
      section: string;
      enabled?: boolean;
      cronExpression?: string;
    }) => {
      const { data } = await apiClient.put(
        ENDPOINTS.scrapingScheduleUpdate(section),
        { enabled, cronExpression }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping"] });
    },
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add admin/src/domain/entities/scraping.ts
git add admin/src/infrastructure/api/endpoints.ts
git add admin/src/infrastructure/query/keys.ts
git add admin/src/infrastructure/query/hooks/use-scraping.ts
git commit -m "feat: add scraping types, endpoints, and React Query hooks to admin"
```

---

## Task 12: Admin Dashboard - Scraping Page

**Files:**
- Create: `admin/src/app/(admin)/scraping/page.tsx`
- Modify: `admin/src/presentation/components/layout/sidebar.tsx`

- [ ] **Step 1: Create the scraping management page**

```tsx
// admin/src/app/(admin)/scraping/page.tsx
"use client";

import { useState } from "react";
import {
  Download,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Database,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/presentation/components/shared/page-header";
import { StatCard } from "@/presentation/components/shared/stat-card";
import {
  useScrapingStatus,
  useScrapingJobs,
  useLegalCatalog,
  useScrapingSchedule,
  useTriggerInitialLoad,
  useTriggerScrape,
  useUpdateSchedule,
} from "@/infrastructure/query/hooks/use-scraping";
import type { ScrapingJob, CatalogEntry, ScrapingSchedule } from "@/domain/entities/scraping";

const statusColors: Record<string, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
  PROCESSING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  DOWNLOADING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  PENDING: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  PAUSED: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  NOT_LOADED: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const sectionLabels: Record<string, string> = {
  REGISTRO_OFICIAL: "Registro Oficial",
  SUPLEMENTO: "Suplemento",
  EDICION_ESPECIAL: "Edicion Especial",
  EDICION_CONSTITUCIONAL: "Edicion Constitucional",
  EDICION_JURIDICA: "Edicion Juridica",
};

export default function ScrapingPage() {
  const [activeTab, setActiveTab] = useState<"jobs" | "catalog" | "schedule">("catalog");
  const { data: status } = useScrapingStatus();
  const { data: jobsData } = useScrapingJobs();
  const { data: catalog } = useLegalCatalog();
  const { data: schedules } = useScrapingSchedule();
  const triggerLoad = useTriggerInitialLoad();
  const triggerScrape = useTriggerScrape();
  const updateSchedule = useUpdateSchedule();

  const loadedCount = (catalog as CatalogEntry[] | undefined)?.filter((c) => c.loaded).length ?? 0;
  const totalCount = (catalog as CatalogEntry[] | undefined)?.length ?? 65;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fuentes Legales"
        description="Ingesta de legislacion ecuatoriana para el sistema RAG"
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => {
                triggerLoad.mutate(undefined, {
                  onSuccess: () => toast.success("Carga inicial iniciada"),
                  onError: () => toast.error("Error al iniciar carga"),
                });
              }}
              disabled={triggerLoad.isPending}
              className="border border-[#2b5ea7]/30 bg-[#1a3a5c] text-white hover:bg-[#2b5ea7]"
            >
              {triggerLoad.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Carga Inicial (65 Codigos)
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Codigos Cargados"
          value={`${loadedCount}/${totalCount}`}
          icon={<Database className="h-5 w-5" />}
        />
        <StatCard
          title="Jobs Activos"
          value={String(status?.runningJobs ?? 0)}
          icon={<Loader2 className="h-5 w-5" />}
        />
        <StatCard
          title="Secciones Programadas"
          value={String((schedules as ScrapingSchedule[] | undefined)?.filter((s) => s.enabled).length ?? 0)}
          icon={<Calendar className="h-5 w-5" />}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-[rgba(43,94,167,0.12)] bg-[rgba(43,94,167,0.03)] p-1">
        {(["catalog", "jobs", "schedule"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-[#1a3a5c] text-white"
                : "text-[#64748b] hover:text-[#94a3b8]"
            }`}
          >
            {tab === "catalog" ? "Catalogo Legal" : tab === "jobs" ? "Jobs de Scraping" : "Programacion"}
          </button>
        ))}
      </div>

      {/* Catalog Tab */}
      {activeTab === "catalog" && catalog && (
        <div className="rounded-2xl border border-[rgba(43,94,167,0.12)] bg-[#0d1b2a]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(43,94,167,0.08)]">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#475569]">Siglas</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#475569]">Nombre</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#475569]">Prioridad</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#475569]">Estado</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#475569]">Chunks</th>
                </tr>
              </thead>
              <tbody>
                {(catalog as CatalogEntry[]).map((entry) => (
                  <tr key={entry.abbreviation} className="border-b border-[rgba(43,94,167,0.05)]">
                    <td className="px-4 py-3 text-sm font-mono font-bold text-[#3b82f6]">{entry.abbreviation}</td>
                    <td className="px-4 py-3 text-sm text-[#e2e8f0]">{entry.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs border-[rgba(43,94,167,0.2)]">
                        P{entry.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${statusColors[entry.status] || statusColors.NOT_LOADED}`}>
                        {entry.status === "NOT_LOADED" ? "No cargado" : entry.status === "COMPLETED" ? "Cargado" : entry.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-[#94a3b8]">{entry.totalChunks || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === "jobs" && jobsData && (
        <div className="space-y-3">
          {(jobsData.content as ScrapingJob[]).map((job) => (
            <div key={job.id} className="rounded-xl border border-[rgba(43,94,167,0.12)] bg-[#0d1b2a] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={`text-xs ${statusColors[job.status]}`}>{job.status}</Badge>
                  <span className="text-sm font-medium text-[#e2e8f0]">
                    {job.jobType === "INITIAL_LOAD" ? "Carga Inicial" : sectionLabels[job.section] || job.section}
                  </span>
                </div>
                <span className="text-xs text-[#64748b]">
                  {job.startedAt ? new Date(job.startedAt).toLocaleString("es-EC") : ""}
                </span>
              </div>
              <div className="mt-3 flex gap-6 text-xs text-[#64748b]">
                <span>Encontrados: <strong className="text-[#94a3b8]">{job.documentsFound}</strong></span>
                <span>Descargados: <strong className="text-[#94a3b8]">{job.documentsDownloaded}</strong></span>
                <span>Procesados: <strong className="text-emerald-400">{job.documentsProcessed}</strong></span>
                <span>Fallidos: <strong className="text-red-400">{job.documentsFailed}</strong></span>
              </div>
              {job.documentsFound > 0 && (
                <div className="mt-2 h-1.5 rounded-full bg-[rgba(43,94,167,0.1)]">
                  <div
                    className="h-full rounded-full bg-[#3b82f6] transition-all"
                    style={{
                      width: `${((job.documentsProcessed + job.documentsFailed) / job.documentsFound) * 100}%`,
                    }}
                  />
                </div>
              )}
              {job.errorMessage && (
                <p className="mt-2 text-xs text-red-400">{job.errorMessage}</p>
              )}
            </div>
          ))}
          {(!jobsData.content || jobsData.content.length === 0) && (
            <p className="py-8 text-center text-sm text-[#64748b]">No hay jobs de scraping aun.</p>
          )}
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === "schedule" && schedules && (
        <div className="space-y-3">
          {(schedules as ScrapingSchedule[]).map((schedule) => (
            <div key={schedule.id} className="flex items-center justify-between rounded-xl border border-[rgba(43,94,167,0.12)] bg-[#0d1b2a] p-4">
              <div>
                <p className="text-sm font-medium text-[#e2e8f0]">
                  {sectionLabels[schedule.section] || schedule.section}
                </p>
                <p className="mt-1 text-xs text-[#64748b]">
                  Cron: {schedule.cronExpression}
                  {schedule.lastExecutionAt && ` | Ultima: ${new Date(schedule.lastExecutionAt).toLocaleString("es-EC")}`}
                  {schedule.nextExecutionAt && ` | Proxima: ${new Date(schedule.nextExecutionAt).toLocaleString("es-EC")}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    triggerScrape.mutate(schedule.section, {
                      onSuccess: () => toast.success(`Scraping de ${sectionLabels[schedule.section]} iniciado`),
                    });
                  }}
                  className="text-[#3b82f6] hover:text-[#60a5fa]"
                >
                  <Play className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    updateSchedule.mutate({
                      section: schedule.section,
                      enabled: !schedule.enabled,
                    });
                  }}
                  className={schedule.enabled ? "text-emerald-400" : "text-[#64748b]"}
                >
                  {schedule.enabled ? "Activo" : "Inactivo"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add nav item to sidebar**

In `admin/src/presentation/components/layout/sidebar.tsx`, add the import and nav item. Add `Globe` to the lucide-react imports:

```typescript
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Activity,
  FileText,
  Settings,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Globe,
} from "lucide-react";
```

Then add this entry to `navItems` array after the `documents` entry:

```typescript
  { href: "/scraping", label: "Fuentes Legales", icon: Globe },
```

- [ ] **Step 3: Commit**

```bash
git add admin/src/app/\(admin\)/scraping/page.tsx
git add admin/src/presentation/components/layout/sidebar.tsx
git commit -m "feat: add scraping management page and nav item to admin dashboard"
```

---

## Task 13: Run SQL Migration on Supabase

This task requires manual execution on the Supabase SQL editor.

- [ ] **Step 1: Run the SQL migration**

Open the Supabase dashboard SQL editor and execute the contents of `backend/src/main/resources/db/migration/V1__scraping_tables.sql`.

- [ ] **Step 2: Verify tables exist**

Run on Supabase:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('legal_sources', 'scraping_jobs', 'scraping_schedule');
```
Expected: 3 rows returned.

- [ ] **Step 3: Verify legal_documents columns**

Run on Supabase:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'legal_documents' AND column_name IN (
    'document_type', 'abbreviation', 'edition_number',
    'publication_date', 'source_id', 'source_url',
    'version', 'priority', 'page_count'
);
```
Expected: 9 rows returned.

---

## Task 14: Build and Verify

- [ ] **Step 1: Build backend**

Run: `cd backend && mvn clean compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 2: Build admin dashboard**

Run: `cd admin && npm run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete RAG legal ingestion pipeline implementation"
```

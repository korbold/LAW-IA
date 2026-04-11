# RAG Legal Ingestion Pipeline - Design Spec

## Overview

System to ingest Ecuadorian legislation into the existing LegalTech RAG pipeline. Two mechanisms:

1. **Initial load**: Download 65+ consolidated legal codes/laws from official sources (ministries, National Assembly, etc.)
2. **Daily scraper**: Automated monitoring of 5 sections of registroficial.gob.ec for new publications

Everything integrated within the existing Spring Boot backend, extending the current document processing pipeline (PDFBox + chunking + Gemini embeddings) with batch processing, rate limiting, and progress tracking.

## Goals

- Populate the RAG knowledge base with Ecuador's core legal framework (65 codes/laws)
- Keep the knowledge base current with daily Registro Oficial publications
- Provide admin visibility into ingestion status, errors, and progress
- Handle Gemini API rate limits gracefully with retries and backoff

## Non-goals

- Full-text legal search engine (the RAG pipeline handles retrieval)
- Automated detection of which articles were reformed (out of scope for now)
- Historical version tracking of individual articles across reforms

---

## Data Sources

### Initial Load - 65 Legal Codes

PDFs downloaded from official government sources (ministries, National Assembly, presidency) that publish consolidated/codified versions with all reforms integrated.

#### Priority 1 - Fundamental Codes (7)

| # | Name | Abbreviation |
|---|------|-------------|
| 1 | Constitucion de la Republica del Ecuador | CRE |
| 2 | Codigo Organico Integral Penal | COIP |
| 3 | Codigo Organico General de Procesos | COGEP |
| 4 | Codigo Civil | CC |
| 5 | Codigo del Trabajo | CT |
| 6 | Codigo Organico de la Funcion Judicial | COFJ |
| 7 | Codigo Organico Administrativo | COA |

#### Priority 2 - High-Consultation Codes and Laws (13)

| # | Name | Abbreviation |
|---|------|-------------|
| 8 | Codigo Organico de Organizacion Territorial, Autonomia y Descentralizacion | COOTAD |
| 9 | Codigo Tributario | CTrib |
| 10 | Codigo de Comercio | CCom |
| 11 | Codigo de la Ninez y Adolescencia | CNA |
| 12 | Codigo Organico Monetario y Financiero | COMF |
| 13 | Codigo Organico de la Produccion, Comercio e Inversiones | COPCI |
| 14 | Ley de Seguridad Social | LSS |
| 15 | Ley Organica del Servicio Publico | LOSEP |
| 16 | Ley de Companias | LC |
| 17 | Ley de Regimen Tributario Interno | LRTI |
| 18 | Ley Organica de Garantias Jurisdiccionales y Control Constitucional | LOGJCC |
| 19 | Ley Organica de Defensa del Consumidor | LODC |
| 20 | Ley Organica del Sistema Nacional de Contratacion Publica | LOSNCP |

#### Priority 3 - Sectoral Laws (20)

| # | Name | Abbreviation |
|---|------|-------------|
| 21 | Ley Organica de Transporte Terrestre, Transito y Seguridad Vial | LOTTTSV |
| 22 | Ley Organica de Movilidad Humana | LOMH |
| 23 | Ley Organica de Educacion Intercultural | LOEI |
| 24 | Ley Organica de Educacion Superior | LOES |
| 25 | Ley Organica de Salud | LOS |
| 26 | Ley Organica de Comunicacion | LOC |
| 27 | Ley Organica de Proteccion de Datos Personales | LOPDP |
| 28 | Ley de Mineria | LM |
| 29 | Codigo Organico del Ambiente | COAm |
| 30 | Ley Organica de Recursos Hidricos, Usos y Aprovechamiento del Agua | LORH |
| 31 | Ley Organica de Tierras Rurales y Territorios Ancestrales | LOTRTA |
| 32 | Ley Organica Electoral - Codigo de la Democracia | CD |
| 33 | Ley Organica de Economia Popular y Solidaria | LOEPS |
| 34 | Ley Organica de Telecomunicaciones | LOT |
| 35 | Ley Organica de Regulacion y Control del Poder de Mercado | LORCPM |
| 36 | Ley Organica Integral para Prevenir y Erradicar la Violencia contra las Mujeres | LOIPEVM |
| 37 | Ley Organica de Participacion Ciudadana | LOPC |
| 38 | Ley Organica del Consejo de Participacion Ciudadana y Control Social | LOCPCCS |
| 39 | Ley Organica de la Contraloria General del Estado | LOCGE |
| 40 | Ley Organica de Extincion de Dominio | LOED |

#### Priority 4 - Complementary and Recent Laws (25)

| # | Name | Abbreviation |
|---|------|-------------|
| 41 | Codigo Organico de las Entidades de Seguridad Ciudadana y Orden Publico | COESCOP |
| 42 | Ley Organica de la Funcion Legislativa | LOFL |
| 43 | Ley Organica de la Funcion de Transparencia y Control Social | LOFTCS |
| 44 | Ley de Inquilinato | LI |
| 45 | Ley de Comercio Electronico, Firmas y Mensajes de Datos | LCE |
| 46 | Ley de Propiedad Intelectual (Codigo Ingenios) | CI |
| 47 | Ley Organica de Arbitraje y Mediacion | LOAM |
| 48 | Ley Organica de Empresas Publicas | LOEP |
| 49 | Ley Organica de Integridad Publica | LOIP |
| 50 | Ley de Transparencia y Acceso a la Informacion Publica | LOTAIP |
| 51 | Ley Organica de Personas con Discapacidad | LOPD |
| 52 | Ley Organica del Deporte, Educacion Fisica y Recreacion | LOD |
| 53 | Ley Organica de Cultura | LOCul |
| 54 | Ley Organica de Prevencion Integral del Fenomeno Socioeconomico de las Drogas | LOPIFSD |
| 55 | Ley Organica de Regimen Especial de la Provincia de Galapagos | LOREG |
| 56 | Ley Organica de Solidaridad Nacional | LOSN |
| 57 | Ley Organica de Inteligencia | LOI |
| 58 | Ley Organica de Soberania Alimentaria | LOSA |
| 59 | Ley Organica de Turismo | LOTur |
| 60 | Ley Organica del Servicio Exterior | LOSE |
| 61 | Ley Organica de Planificacion y Finanzas Publicas | LOPFP |
| 62 | Ley Organica del Sistema Nacional de Registro de Datos Publicos | LOSNRDP |
| 63 | Ley Organica de Gestion de la Identidad y Datos Civiles | LOGIDC |
| 64 | Ley Organica para el Desarrollo Economico y Sostenibilidad Fiscal | LODESF |
| 65 | Ley Organica de Prevencion y Sancion de la Violencia en el Deporte | LOPSVD |

### Daily Scraper - Registro Oficial

5 sections from registroficial.gob.ec:

| Section | Content | URL Pattern |
|---------|---------|-------------|
| Registro Oficial | State institution normative | `/245427-2/` |
| Suplemento | Additional state normative | `/255776-2/` |
| Edicion Especial | GAD normative | `/261974-2/` |
| Edicion Constitucional | Constitutional Court decisions | `/267099-2/` |
| Edicion Juridica | National Court of Justice decisions | `/266381-2/` |

PDF download URLs follow the pattern:
```
https://esacc.corteconstitucional.gob.ec/storage/api/v1/10_DWL_FL/{base64_token}
```
Where the token is a base64-encoded JSON: `{"carpeta": "ro", "uuid": "{uuid}.pdf"}`

Each edition page shows: type, edition number (e.g. "Ano II - No 262"), date, page count, and download link. No authentication required.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Admin Dashboard                    │
│  (Next.js - new "Legal Sources" section)            │
│  - 65 codes status table                            │
│  - Daily editions downloaded                        │
│  - Scraping jobs (status, errors, retries)          │
│  - Buttons: manual scrape, retry failed, init load  │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│                Spring Boot Backend                   │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │         ScrapingSchedulerService             │    │
│  │  @Scheduled(cron = "0 0 6 * * *")           │    │
│  │  - Runs daily at 6AM                        │    │
│  │  - Scrapes 5 Registro Oficial sections      │    │
│  │  - Detects new editions only                │    │
│  └──────────────────┬──────────────────────────┘    │
│                     │                                │
│  ┌──────────────────▼──────────────────────────┐    │
│  │         RegistroOficialScraper              │    │
│  │  - Navigates section pages by year          │    │
│  │  - Parses HTML for edition metadata         │    │
│  │  - Downloads PDFs via WebClient             │    │
│  │  - Skips already-downloaded editions        │    │
│  └──────────────────┬──────────────────────────┘    │
│                     │                                │
│  ┌──────────────────▼──────────────────────────┐    │
│  │         InitialLoadService                  │    │
│  │  - Catalog of 65 codes with source URLs     │    │
│  │  - Downloads from direct official sources   │    │
│  │  - Triggered via admin endpoint             │    │
│  └──────────────────┬──────────────────────────┘    │
│                     │                                │
│  ┌──────────────────▼──────────────────────────┐    │
│  │      BatchDocumentProcessingService         │    │
│  │  - Processing queue                         │    │
│  │  - Text extraction (PDFBox)                 │    │
│  │  - Chunking (1500 chars, 200 overlap)       │    │
│  │  - Gemini embeddings with rate limiting     │    │
│  │  - Exponential backoff retries              │    │
│  │  - Trackable progress per job               │    │
│  └──────────────────┬──────────────────────────┘    │
│                     │                                │
│  ┌──────────────────▼──────────────────────────┐    │
│  │              JPA Repositories               │    │
│  │  legal_sources, legal_documents,            │    │
│  │  document_chunks, scraping_jobs,            │    │
│  │  scraping_schedule                          │    │
│  └──────────────────┬──────────────────────────┘    │
└──────────────────────┼──────────────────────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   PostgreSQL (Supabase)    │
         │   + pgvector extension     │
         └───────────────────────────┘
```

---

## Data Model

### `legal_sources` (new table)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(255) | e.g. "Registro Oficial", "Asamblea Nacional" |
| type | VARCHAR(50) | MINISTERIO, ASAMBLEA, REGISTRO_OFICIAL, CORTE, PRESIDENCIA |
| base_url | VARCHAR(500) | Base URL of the source |
| description | TEXT | Optional description |
| active | BOOLEAN | Whether to scrape this source |
| created_at | TIMESTAMP | Creation timestamp |

### `legal_documents` (extend existing table)

New columns added to the existing table:

| Column | Type | Description |
|--------|------|-------------|
| document_type | VARCHAR(50) | CODIGO, LEY_ORGANICA, LEY_ORDINARIA, REGISTRO_OFICIAL, SUPLEMENTO, EDICION_ESPECIAL, EDICION_CONSTITUCIONAL, EDICION_JURIDICA |
| abbreviation | VARCHAR(20) | COIP, COGEP, CC, etc. (nullable for RO editions) |
| edition_number | VARCHAR(50) | For RO: "No. 733", for codes: null |
| publication_date | DATE | Date of publication |
| source_id | UUID FK | References legal_sources |
| source_url | VARCHAR(1000) | Original download URL |
| version | VARCHAR(100) | For codes: "2024-consolidada", for RO: null |
| priority | INTEGER | 1-4 based on catalog priority |
| page_count | INTEGER | Number of pages in PDF |

Existing columns remain: id, title, file_name, file_type, file_size, status, total_chunks, uploaded_by, uploaded_by_email, error_message, created_at, updated_at.

### `scraping_jobs` (new table)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| source_id | UUID FK | References legal_sources |
| job_type | VARCHAR(50) | INITIAL_LOAD, DAILY_SCRAPE, MANUAL_SCRAPE |
| section | VARCHAR(50) | REGISTRO_OFICIAL, SUPLEMENTO, EDICION_ESPECIAL, EDICION_CONSTITUCIONAL, EDICION_JURIDICA (nullable for initial load) |
| status | VARCHAR(20) | PENDING, DOWNLOADING, PROCESSING, COMPLETED, FAILED, PAUSED |
| documents_found | INTEGER | Total documents detected |
| documents_downloaded | INTEGER | Successfully downloaded |
| documents_processed | INTEGER | Successfully processed (chunked + embedded) |
| documents_failed | INTEGER | Failed to process |
| started_at | TIMESTAMP | Job start time |
| completed_at | TIMESTAMP | Job completion time |
| error_message | TEXT | Last error message |
| retry_count | INTEGER | Number of retries attempted |
| max_retries | INTEGER | Default 3 |
| next_retry_at | TIMESTAMP | When to retry next |
| created_at | TIMESTAMP | Creation timestamp |

### `scraping_schedule` (new table)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| section | VARCHAR(50) | Section name |
| cron_expression | VARCHAR(50) | Default "0 0 6 * * *" (6AM daily) |
| enabled | BOOLEAN | Whether this section is active |
| last_execution_at | TIMESTAMP | Last run time |
| last_status | VARCHAR(20) | COMPLETED, FAILED |
| next_execution_at | TIMESTAMP | Next scheduled run |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update |

### `document_chunks` (no changes)

Existing table remains as-is: id, document_id, chunk_index, content, embedding::vector(768).

---

## Backend Services

### InitialLoadService

Manages the catalog of 65 legal codes and their download from official sources.

- Stores the catalog as a configuration list (abbreviation, name, priority, source URL)
- On trigger: creates a scraping_job of type INITIAL_LOAD, iterates the catalog, downloads PDFs via WebClient, creates legal_document entries, enqueues for batch processing
- Skips codes already loaded (checks by abbreviation)
- Concurrency limit: 3 simultaneous downloads

### RegistroOficialScraper

Scrapes registroficial.gob.ec for new editions.

- Fetches the HTML page for each section
- Parses edition metadata: title, number, date, page count, download URL
- Compares against existing legal_documents by edition_number + document_type
- Downloads only new editions via WebClient
- The site uses WordPress/Divi with server-rendered content accessible via standard HTTP GET (no JS rendering needed for the product listing pages)

### BatchDocumentProcessingService

Processes downloaded PDFs through the RAG pipeline.

- Picks up documents in PENDING status from a processing queue
- Extracts text using PDFBox (already a dependency)
- Chunks text at 1500 characters with 200 character overlap (existing parameters)
- Generates embeddings via Gemini API with rate limiting:
  - Max 5 requests/second to Gemini embedding API
  - Batch chunks where possible
  - On 429 response: exponential backoff (1s, 4s, 16s)
  - On 5 consecutive failures: pause job, set status PAUSED, log alert
- Updates scraping_job progress counters as each document completes
- On document failure: marks document as FAILED with error_message, increments documents_failed counter, continues with next document

### ScrapingSchedulerService

Orchestrates the daily scraping schedule.

- Reads enabled entries from scraping_schedule
- Uses Spring @Scheduled with a fixed check interval (every minute)
- Compares current time against next_execution_at for each section
- When due: creates scraping_job, invokes RegistroOficialScraper for that section
- Updates last_execution_at and next_execution_at after completion

---

## Admin API Endpoints

```
GET    /api/v1/admin/scraping/status              -- Overall status summary
GET    /api/v1/admin/scraping/jobs                 -- List jobs (filterable by status, section, date)
GET    /api/v1/admin/scraping/jobs/{id}            -- Job detail with per-document status
POST   /api/v1/admin/scraping/initial-load         -- Trigger initial load of 65 codes
POST   /api/v1/admin/scraping/run/{section}        -- Manual scrape for a section
POST   /api/v1/admin/scraping/retry/{jobId}        -- Retry a failed job
POST   /api/v1/admin/scraping/retry-document/{id}  -- Retry a single failed document
GET    /api/v1/admin/legal-catalog                 -- 65 codes with load status
GET    /api/v1/admin/scraping/schedule             -- Current schedule config
PUT    /api/v1/admin/scraping/schedule             -- Update schedule (cron, enabled sections)
```

All endpoints require ROLE_ADMIN, consistent with existing admin endpoints.

---

## Admin Dashboard - New Section

### Legal Catalog View
- Table of 65 codes: name, abbreviation, priority, status (pending/processing/completed/failed), chunks generated, date loaded
- Filter by priority level and status
- Action: re-process individual code

### Registro Oficial View
- Grid/table of daily editions downloaded
- Filter by section (5 sections) and date range
- Shows: edition number, date, pages, status, chunks
- Newest first

### Scraping Jobs View
- List of all scraping jobs with: type, section, status, progress bar (processed/found), duration, errors
- Expand to see per-document status within a job
- Action buttons: retry failed, pause running

### Schedule Config View
- Table of 5 sections with: enabled toggle, cron expression, last run, last status, next run
- Edit cron per section

---

## Rate Limiting and Resilience

| Resource | Limit | Strategy |
|----------|-------|----------|
| Gemini embeddings API | 5 req/sec | Token bucket rate limiter |
| PDF downloads (registroficial) | 3 concurrent | Semaphore |
| PDF downloads (initial load) | 3 concurrent | Semaphore |
| Gemini 429 responses | 3 retries | Exponential backoff: 1s, 4s, 16s |
| Download failures | 3 retries | Exponential backoff: 2s, 8s, 32s |
| Consecutive Gemini failures | 5 | Circuit breaker: pause job |

---

## Integration with Existing RAG

The existing `DocumentProcessingService` and `GeminiService` already handle:
- Text extraction from PDF (PDFBox)
- Chunking (1500 chars, 200 overlap)
- Embedding generation via Gemini
- Vector similarity search via `match_document_chunks()` SQL function
- RAG context injection into chat prompts

The new batch service reuses these capabilities but adds:
- Queue-based processing instead of synchronous
- Rate limiting for Gemini API
- Progress tracking per job
- Retry logic with backoff

The existing chat flow (`/api/v1/chat/stream`) requires no changes. Once documents are chunked and embedded, they're automatically available for RAG retrieval through the existing `match_document_chunks()` function.

---

## Migration Path

Since `legal_documents` already exists with data, the new columns must be nullable or have defaults:
- `document_type`: default null (existing documents won't have this)
- `abbreviation`: nullable
- `edition_number`: nullable
- `publication_date`: nullable
- `source_id`: nullable (no FK constraint on existing rows)
- `source_url`: nullable
- `version`: nullable
- `priority`: default null
- `page_count`: nullable

New tables (`legal_sources`, `scraping_jobs`, `scraping_schedule`) are created fresh.

Schema changes applied via SQL scripts executed on Supabase (consistent with existing approach: `jpa.hibernate.ddl-auto=none`).

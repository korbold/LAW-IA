-- V1__scraping_tables.sql

CREATE TABLE IF NOT EXISTS legal_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    base_url VARCHAR(500),
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(50);
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS abbreviation VARCHAR(20);
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS edition_number VARCHAR(50);
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS publication_date DATE;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES legal_sources(id);
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS source_url VARCHAR(1000);
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS version VARCHAR(100);
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS priority INTEGER;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS page_count INTEGER;

CREATE INDEX IF NOT EXISTS idx_legal_documents_edition_type ON legal_documents(edition_number, document_type);
CREATE INDEX IF NOT EXISTS idx_legal_documents_abbreviation ON legal_documents(abbreviation);

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

INSERT INTO scraping_schedule (section, cron_expression, enabled) VALUES
    ('REGISTRO_OFICIAL', '0 0 6 * * *', true),
    ('SUPLEMENTO', '0 10 6 * * *', true),
    ('EDICION_ESPECIAL', '0 20 6 * * *', true),
    ('EDICION_CONSTITUCIONAL', '0 30 6 * * *', true),
    ('EDICION_JURIDICA', '0 40 6 * * *', true)
ON CONFLICT (section) DO NOTHING;

INSERT INTO legal_sources (name, type, base_url, description) VALUES
    ('Registro Oficial', 'REGISTRO_OFICIAL', 'https://www.registroficial.gob.ec', 'Publicaciones diarias del Registro Oficial del Ecuador'),
    ('Asamblea Nacional', 'ASAMBLEA', 'https://www.asambleanacional.gob.ec', 'Leyes vigentes publicadas por la Asamblea Nacional'),
    ('Presidencia de la Republica', 'PRESIDENCIA', 'https://www.presidencia.gob.ec', 'Normativa publicada por la Presidencia'),
    ('Ministerios', 'MINISTERIO', NULL, 'PDFs de codigos publicados por ministerios sectoriales'),
    ('Corte Constitucional', 'CORTE', 'https://www.corteconstitucional.gob.ec', 'Sistema ESACC de la Corte Constitucional')
ON CONFLICT DO NOTHING;

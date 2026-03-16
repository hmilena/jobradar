-- ============================================================
-- JobRadar Portugal - Database Schema
-- ============================================================
-- Requer: PostgreSQL 15+ com extensão pgvector
-- Supabase já inclui pgvector por padrão
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- COMPANIES - Lista curada de empresas que contratam diretamente
-- ============================================================
CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  domain        TEXT,
  careers_url   TEXT,
  category      TEXT NOT NULL,  -- 'banco' | 'fintech' | 'telco' | 'seguradora' | 'software' | 'ecommerce' | etc
  city          TEXT,
  country       TEXT DEFAULT 'PT',
  logo_url      TEXT,
  linkedin_url  TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  job_selector  TEXT,           -- CSS selector customizado para o scraper
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- JOBS - Vagas coletadas pelo scraper
-- ============================================================
CREATE TABLE jobs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id            UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Dados da vaga
  title                 TEXT NOT NULL,
  url                   TEXT UNIQUE NOT NULL,
  location              TEXT,
  remote_type           TEXT CHECK (remote_type IN ('remote', 'hybrid', 'onsite', 'unknown')),
  seniority             TEXT CHECK (seniority IN ('intern', 'junior', 'mid', 'senior', 'lead', 'manager', 'unknown')),
  tech_stack            TEXT[] DEFAULT '{}',
  salary_min            INTEGER,  -- em EUR/mês
  salary_max            INTEGER,
  description_raw       TEXT,     -- HTML original
  description_clean     TEXT,     -- texto limpo

  -- Metadados do scraper
  source                TEXT NOT NULL,   -- 'careers_page' | 'itjobs' | 'linkedin'
  hash                  TEXT UNIQUE NOT NULL,  -- SHA256(title + company_slug + url)

  -- Classificação IA
  is_consultoria        BOOLEAN,
  classifier_confidence FLOAT,
  classifier_reason     TEXT,
  classifier_ran_at     TIMESTAMPTZ,

  -- Busca semântica
  embedding             vector(1536),

  -- Estado
  is_active             BOOLEAN DEFAULT TRUE,
  first_seen_at         TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at          TIMESTAMPTZ DEFAULT NOW(),
  expires_at            TIMESTAMPTZ
);

-- ============================================================
-- SCRAPER_RUNS - Log de execuções do scraper
-- ============================================================
CREATE TABLE scraper_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  status          TEXT CHECK (status IN ('running', 'success', 'partial', 'failed')),
  jobs_found      INTEGER DEFAULT 0,
  jobs_new        INTEGER DEFAULT 0,
  jobs_updated    INTEGER DEFAULT 0,
  errors          JSONB DEFAULT '[]',
  metadata        JSONB DEFAULT '{}'
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_jobs_company_id    ON jobs(company_id);
CREATE INDEX idx_jobs_is_active     ON jobs(is_active);
CREATE INDEX idx_jobs_is_consultoria ON jobs(is_consultoria);
CREATE INDEX idx_jobs_remote_type   ON jobs(remote_type);
CREATE INDEX idx_jobs_seniority     ON jobs(seniority);
CREATE INDEX idx_jobs_first_seen_at ON jobs(first_seen_at DESC);
CREATE INDEX idx_jobs_tech_stack    ON jobs USING GIN(tech_stack);
CREATE INDEX idx_jobs_embedding     ON jobs USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_companies_category ON companies(category);
CREATE INDEX idx_companies_city     ON companies(city);
CREATE INDEX idx_companies_is_active ON companies(is_active);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Marca vagas como inativas após 60 dias sem aparecer no scraper
CREATE OR REPLACE FUNCTION deactivate_old_jobs()
RETURNS void AS $$
BEGIN
  UPDATE jobs
  SET is_active = FALSE
  WHERE last_seen_at < NOW() - INTERVAL '60 days'
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Busca semântica por similaridade
CREATE OR REPLACE FUNCTION search_jobs_semantic(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  company_id UUID,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    jobs.id,
    jobs.title,
    jobs.company_id,
    1 - (jobs.embedding <=> query_embedding) AS similarity
  FROM jobs
  WHERE is_active = TRUE
    AND is_consultoria = FALSE
    AND 1 - (jobs.embedding <=> query_embedding) > match_threshold
  ORDER BY jobs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (para Supabase)
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Leitura pública de companies e jobs
CREATE POLICY "Public read companies" ON companies FOR SELECT USING (true);
CREATE POLICY "Public read jobs" ON jobs FOR SELECT USING (true);

-- Escrita apenas para service_role (Supabase — não aplicável em dev local)
-- Em produção no Supabase, adicionar manualmente:
-- CREATE POLICY "Service write companies" ON companies FOR ALL USING (auth.role() = 'service_role');
-- CREATE POLICY "Service write jobs" ON jobs FOR ALL USING (auth.role() = 'service_role');
-- CREATE POLICY "Service write scraper_runs" ON scraper_runs FOR ALL USING (auth.role() = 'service_role');

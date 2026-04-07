-- ============================================================
-- Migration 004 — Adiciona republish_count às vagas
-- ============================================================
-- Rastreia quantas vezes uma vaga foi republicada no job board
-- (i.e., foi vista novamente após ter ficado inativa)
-- ============================================================

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS republish_count INTEGER NOT NULL DEFAULT 0;

-- Preenche first_seen_at com created_at para vagas que não têm (por segurança)
UPDATE jobs
SET first_seen_at = NOW()
WHERE first_seen_at IS NULL;

-- Índice para facilitar ordenação por frescor
CREATE INDEX IF NOT EXISTS idx_jobs_republish_count ON jobs(republish_count);

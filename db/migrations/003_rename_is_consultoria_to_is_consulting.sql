-- ============================================================
-- JobRadar Portugal - Migration
-- Rename jobs.is_consultoria -> jobs.is_consulting
-- ============================================================

-- Rename the column when upgrading an existing local DB.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'is_consultoria'
  ) THEN
    ALTER TABLE jobs RENAME COLUMN is_consultoria TO is_consulting;
  END IF;
END $$;

-- Rename the index for consistency (best-effort).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_jobs_is_consultoria'
  ) THEN
    ALTER INDEX idx_jobs_is_consultoria RENAME TO idx_jobs_is_consulting;
  END IF;
END $$;

-- Ensure semantic search function references the new column.
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
    AND is_consulting = FALSE
    AND 1 - (jobs.embedding <=> query_embedding) > match_threshold
  ORDER BY jobs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;


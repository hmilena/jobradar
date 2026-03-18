-- Migration 002: Add role column to jobs table
-- Run this on production (Neon) if the column doesn't exist yet

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'unknown';

CREATE INDEX IF NOT EXISTS idx_jobs_role ON jobs(role);

-- Backfill role from title for existing jobs (most specific first)
UPDATE jobs SET role = 'QA'
WHERE (role IS NULL OR role = 'unknown')
  AND (
    LOWER(title) LIKE '%qa %' OR LOWER(title) LIKE '% qa' OR
    LOWER(title) LIKE '%quality assurance%' OR LOWER(title) LIKE '%tester%' OR
    LOWER(title) LIKE '%test engineer%' OR LOWER(title) LIKE '%qa engineer%' OR
    LOWER(title) LIKE '%automation engineer%' OR LOWER(title) LIKE '%qa analyst%'
  );

UPDATE jobs SET role = 'Data'
WHERE (role IS NULL OR role = 'unknown')
  AND (
    LOWER(title) LIKE '%data engineer%' OR LOWER(title) LIKE '%data scientist%' OR
    LOWER(title) LIKE '%data analyst%' OR LOWER(title) LIKE '%analytics engineer%' OR
    LOWER(title) LIKE '%ml engineer%' OR LOWER(title) LIKE '%machine learning engineer%' OR
    LOWER(title) LIKE '%ai engineer%'
  );

UPDATE jobs SET role = 'DevOps'
WHERE (role IS NULL OR role = 'unknown')
  AND (
    LOWER(title) LIKE '%devops%' OR LOWER(title) LIKE '%dev ops%' OR
    LOWER(title) LIKE '%sre%' OR LOWER(title) LIKE '%site reliability%' OR
    LOWER(title) LIKE '%platform engineer%' OR LOWER(title) LIKE '%infrastructure engineer%' OR
    LOWER(title) LIKE '%cloud engineer%'
  );

UPDATE jobs SET role = 'Fullstack'
WHERE (role IS NULL OR role = 'unknown')
  AND (
    LOWER(title) LIKE '%fullstack%' OR LOWER(title) LIKE '%full-stack%' OR
    LOWER(title) LIKE '%full stack%'
  );

UPDATE jobs SET role = 'Frontend'
WHERE (role IS NULL OR role = 'unknown')
  AND (
    LOWER(title) LIKE '%frontend%' OR LOWER(title) LIKE '%front-end%' OR
    LOWER(title) LIKE '%front end%' OR LOWER(title) LIKE '%ui developer%' OR
    LOWER(title) LIKE '%ui engineer%'
  );

UPDATE jobs SET role = 'Backend'
WHERE (role IS NULL OR role = 'unknown')
  AND (
    LOWER(title) LIKE '%backend%' OR LOWER(title) LIKE '%back-end%' OR
    LOWER(title) LIKE '%back end%'
  );

UPDATE jobs SET role = 'Mobile'
WHERE (role IS NULL OR role = 'unknown')
  AND (
    LOWER(title) LIKE '%mobile%' OR LOWER(title) LIKE '%android developer%' OR
    LOWER(title) LIKE '%ios developer%' OR LOWER(title) LIKE '%react native%'
  );

UPDATE jobs SET role = 'Security'
WHERE (role IS NULL OR role = 'unknown')
  AND (
    LOWER(title) LIKE '%security engineer%' OR LOWER(title) LIKE '%security analyst%' OR
    LOWER(title) LIKE '%appsec%' OR LOWER(title) LIKE '%cybersecurity%'
  );

UPDATE jobs SET role = 'Design'
WHERE (role IS NULL OR role = 'unknown')
  AND (
    LOWER(title) LIKE '%ux designer%' OR LOWER(title) LIKE '%ui designer%' OR
    LOWER(title) LIKE '%ui/ux%' OR LOWER(title) LIKE '%product designer%' OR
    LOWER(title) LIKE '%ux researcher%'
  );

-- Ver resultado
SELECT role, COUNT(*) FROM jobs GROUP BY role ORDER BY COUNT(*) DESC;

-- ============================================================
-- TestCraft — 017_fix_learning_paths_title_nullable.sql
-- Make legacy `title` and `description` columns nullable on
-- learning_paths so inserts using only title_en / title_ar work.
-- ============================================================
-- This migration is idempotent — safe to re-run.
-- ============================================================

-- Drop the old NOT NULL constraints on the legacy mono-lingual columns.
-- The app now writes title_en / title_ar (and description_en / description_ar),
-- so the legacy columns must allow NULL.

ALTER TABLE public.learning_paths
  ALTER COLUMN title       DROP NOT NULL,
  ALTER COLUMN description DROP NOT NULL;

-- Remove the old check constraints that referenced the legacy columns
-- (they would still fire on NULL values in some Postgres versions).
ALTER TABLE public.learning_paths
  DROP CONSTRAINT IF EXISTS learning_paths_title_min,
  DROP CONSTRAINT IF EXISTS learning_paths_desc_min;

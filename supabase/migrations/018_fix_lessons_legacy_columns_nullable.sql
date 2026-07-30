-- ============================================================
-- TestCraft — 018_fix_lessons_legacy_columns_nullable.sql
-- Make legacy `title` and `content` columns nullable on
-- lessons so inserts and updates work without requiring legacy mono-lingual fields.
-- ============================================================
-- This migration is idempotent — safe to re-run.
-- ============================================================

ALTER TABLE public.lessons
  ALTER COLUMN title   DROP NOT NULL,
  ALTER COLUMN content DROP NOT NULL;

ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS lessons_title_min,
  DROP CONSTRAINT IF EXISTS lessons_content_min;

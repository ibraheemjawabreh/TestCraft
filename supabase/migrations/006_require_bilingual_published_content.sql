-- ============================================================
-- TestCraft - 006_require_bilingual_published_content.sql
-- Prevent publishing/activating user-facing content without both locales.
-- ============================================================
-- Existing rows are not scanned because these constraints are NOT VALID.
-- PostgreSQL will still enforce them for new rows and future updates.
-- ============================================================

ALTER TABLE public.learning_paths
  DROP CONSTRAINT IF EXISTS learning_paths_active_requires_bilingual_content;

ALTER TABLE public.learning_paths
  ADD CONSTRAINT learning_paths_active_requires_bilingual_content
  CHECK (
    is_active IS NOT TRUE
    OR (
      nullif(trim(title_en), '') IS NOT NULL
      AND nullif(trim(title_ar), '') IS NOT NULL
      AND nullif(trim(description_en), '') IS NOT NULL
      AND nullif(trim(description_ar), '') IS NOT NULL
    )
  ) NOT VALID;

ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS lessons_published_requires_bilingual_content;

ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_published_requires_bilingual_content
  CHECK (
    is_published IS NOT TRUE
    OR (
      nullif(trim(title_en), '') IS NOT NULL
      AND nullif(trim(title_ar), '') IS NOT NULL
      AND nullif(trim(content_en), '') IS NOT NULL
      AND nullif(trim(content_ar), '') IS NOT NULL
    )
  ) NOT VALID;

ALTER TABLE public.challenges
  DROP CONSTRAINT IF EXISTS challenges_active_requires_bilingual_content;

ALTER TABLE public.challenges
  ADD CONSTRAINT challenges_active_requires_bilingual_content
  CHECK (
    is_active IS NOT TRUE
    OR (
      nullif(trim(title_en), '') IS NOT NULL
      AND nullif(trim(title_ar), '') IS NOT NULL
      AND nullif(trim(description_en), '') IS NOT NULL
      AND nullif(trim(description_ar), '') IS NOT NULL
    )
  ) NOT VALID;

ALTER TABLE public.challenges
  DROP CONSTRAINT IF EXISTS challenges_optional_text_requires_matching_locale;

ALTER TABLE public.challenges
  ADD CONSTRAINT challenges_optional_text_requires_matching_locale
  CHECK (
    (
      nullif(trim(coalesce(scenario_en, '')), '') IS NULL
      AND nullif(trim(coalesce(scenario_ar, '')), '') IS NULL
    )
    OR (
      nullif(trim(coalesce(scenario_en, '')), '') IS NOT NULL
      AND nullif(trim(coalesce(scenario_ar, '')), '') IS NOT NULL
    )
  )
  NOT VALID;

ALTER TABLE public.challenges
  DROP CONSTRAINT IF EXISTS challenges_optional_instructions_requires_matching_locale;

ALTER TABLE public.challenges
  ADD CONSTRAINT challenges_optional_instructions_requires_matching_locale
  CHECK (
    (
      nullif(trim(coalesce(instructions_en, '')), '') IS NULL
      AND nullif(trim(coalesce(instructions_ar, '')), '') IS NULL
    )
    OR (
      nullif(trim(coalesce(instructions_en, '')), '') IS NOT NULL
      AND nullif(trim(coalesce(instructions_ar, '')), '') IS NOT NULL
    )
  )
  NOT VALID;

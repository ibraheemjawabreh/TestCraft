-- ============================================================
-- TestCraft — 005_learning_experience_correction.sql
-- Bilingual fields, Challenge logic, and Challenge Progress
-- ============================================================
-- This migration is idempotent — safe to re-run.
-- ============================================================

-- ─── 1. learning_paths translations ──────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'learning_paths' AND column_name = 'title_en'
  ) THEN
    ALTER TABLE public.learning_paths ADD COLUMN title_en text;
    ALTER TABLE public.learning_paths ADD COLUMN title_ar text;
    ALTER TABLE public.learning_paths ADD COLUMN description_en text;
    ALTER TABLE public.learning_paths ADD COLUMN description_ar text;
  END IF;
END $$;

-- Migrate existing data
UPDATE public.learning_paths 
SET 
  title_en = title,
  description_en = description
WHERE title_en IS NULL;

-- ─── 2. lessons translations ────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'title_en'
  ) THEN
    ALTER TABLE public.lessons ADD COLUMN title_en text;
    ALTER TABLE public.lessons ADD COLUMN title_ar text;
    ALTER TABLE public.lessons ADD COLUMN summary_en text;
    ALTER TABLE public.lessons ADD COLUMN summary_ar text;
    ALTER TABLE public.lessons ADD COLUMN content_en text;
    ALTER TABLE public.lessons ADD COLUMN content_ar text;
    ALTER TABLE public.lessons ADD COLUMN objectives_en text[] NOT NULL DEFAULT '{}';
    ALTER TABLE public.lessons ADD COLUMN objectives_ar text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- Migrate existing data
UPDATE public.lessons
SET 
  title_en = title,
  summary_en = summary,
  content_en = content,
  objectives_en = objectives
WHERE title_en IS NULL;

-- ─── 3. challenges translations and logic ───────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'title_en'
  ) THEN
    ALTER TABLE public.challenges ADD COLUMN title_en text;
    ALTER TABLE public.challenges ADD COLUMN title_ar text;
    ALTER TABLE public.challenges ADD COLUMN description_en text;
    ALTER TABLE public.challenges ADD COLUMN description_ar text;
    ALTER TABLE public.challenges ADD COLUMN scenario_en text;
    ALTER TABLE public.challenges ADD COLUMN scenario_ar text;
    ALTER TABLE public.challenges ADD COLUMN instructions_en text;
    ALTER TABLE public.challenges ADD COLUMN instructions_ar text;
    
    ALTER TABLE public.challenges ADD COLUMN is_required boolean NOT NULL DEFAULT true;
    ALTER TABLE public.challenges ADD COLUMN unlock_after_lesson boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Migrate existing data
UPDATE public.challenges
SET 
  title_en = title,
  description_en = description,
  scenario_en = scenario,
  instructions_en = instructions
WHERE title_en IS NULL;

-- ─── 4. challenge_progress ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.challenge_progress (
  user_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id   uuid        NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  started_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),
  submitted_at   timestamptz,
  completed_at   timestamptz,
  status         text        NOT NULL DEFAULT 'not_started',
  created_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),

  PRIMARY KEY (user_id, challenge_id),
  CONSTRAINT challenge_progress_status_check CHECK (status IN ('not_started', 'in_progress', 'submitted', 'reviewed', 'needs_improvement'))
);

-- Trigger for challenge_progress updated_at
DROP TRIGGER IF EXISTS set_challenge_progress_updated_at ON public.challenge_progress;
CREATE TRIGGER set_challenge_progress_updated_at
  BEFORE UPDATE ON public.challenge_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS for challenge_progress
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenge_progress_select_own"
  ON public.challenge_progress FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "challenge_progress_insert_own"
  ON public.challenge_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "challenge_progress_update_own"
  ON public.challenge_progress FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_progress TO authenticated;

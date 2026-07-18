-- ============================================================
-- TestCraft — 011_learning_modules_engine.sql
-- Introduces the Module layer between Learning Paths and Lessons.
-- Hierarchy: Learning Path → Module → Lessons → Module Challenge
-- ============================================================
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE everywhere).
-- ============================================================

-- ─── 1. New Enums ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.lesson_progress_status AS ENUM ('not_started', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.challenge_progress_status AS ENUM ('locked', 'available', 'in_progress', 'submitted', 'approved', 'rejected', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.module_status AS ENUM ('locked', 'available', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. learning_modules ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.learning_modules (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_path_id uuid        NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  title_en         text        NOT NULL,
  title_ar         text,
  description_en   text,
  description_ar   text,
  slug             text        NOT NULL,
  sort_order       integer     NOT NULL DEFAULT 0,
  is_published     boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at       timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT learning_modules_title_min  CHECK (char_length(trim(title_en)) >= 2),
  CONSTRAINT learning_modules_sort_order CHECK (sort_order >= 0),
  CONSTRAINT learning_modules_unique_slug UNIQUE (learning_path_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_learning_modules_path_id  ON public.learning_modules(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_learning_modules_sort     ON public.learning_modules(learning_path_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_learning_modules_published ON public.learning_modules(is_published);

-- ─── 3. Add module_id to lessons ─────────────────────────────────────────────
-- We add module_id as nullable first, populate it, then enforce NOT NULL.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'module_id'
  ) THEN
    ALTER TABLE public.lessons ADD COLUMN module_id uuid REFERENCES public.learning_modules(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Data migration: Create one default module per learning path for existing lessons.
DO $$
DECLARE
  path_record RECORD;
  new_module_id uuid;
BEGIN
  FOR path_record IN SELECT DISTINCT learning_path_id FROM public.lessons WHERE module_id IS NULL LOOP
    -- Create a default module for this path if it doesn't already have one with slug 'module-1'
    SELECT id INTO new_module_id
    FROM public.learning_modules
    WHERE learning_path_id = path_record.learning_path_id AND slug = 'module-1'
    LIMIT 1;

    IF new_module_id IS NULL THEN
      INSERT INTO public.learning_modules (learning_path_id, title_en, title_ar, slug, sort_order, is_published)
      VALUES (
        path_record.learning_path_id,
        'Module 1',
        'الوحدة 1',
        'module-1',
        1,
        true
      )
      RETURNING id INTO new_module_id;
    END IF;

    -- Assign all lessons from this path (that lack a module) to this default module
    UPDATE public.lessons
    SET module_id = new_module_id
    WHERE learning_path_id = path_record.learning_path_id AND module_id IS NULL;
  END LOOP;
END $$;

-- ─── 4. Add module_id to challenges (Module Challenge concept) ────────────────
-- Each module has at most 1 challenge. Keep lesson_id for legacy data.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'module_id'
  ) THEN
    ALTER TABLE public.challenges ADD COLUMN module_id uuid REFERENCES public.learning_modules(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Populate module_id for existing challenges that have a lesson_id
DO $$
BEGIN
  UPDATE public.challenges c
  SET module_id = l.module_id
  FROM public.lessons l
  WHERE c.lesson_id = l.id
    AND c.module_id IS NULL
    AND l.module_id IS NOT NULL;
END $$;

-- ─── 5. Extend lesson_progress ────────────────────────────────────────────────

-- Add id (for upsert-friendly updates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lesson_progress' AND column_name = 'id'
  ) THEN
    ALTER TABLE public.lesson_progress ADD COLUMN id uuid DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Add status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lesson_progress' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.lesson_progress ADD COLUMN status public.lesson_progress_status NOT NULL DEFAULT 'not_started';
  END IF;
END $$;

-- Add time_spent_seconds
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lesson_progress' AND column_name = 'time_spent_seconds'
  ) THEN
    ALTER TABLE public.lesson_progress ADD COLUMN time_spent_seconds integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add started_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lesson_progress' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE public.lesson_progress ADD COLUMN started_at timestamptz NOT NULL DEFAULT timezone('utc', now());
  END IF;
END $$;

-- Add updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lesson_progress' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.lesson_progress ADD COLUMN updated_at timestamptz NOT NULL DEFAULT timezone('utc', now());
  END IF;
END $$;

-- Backfill status for existing progress rows
UPDATE public.lesson_progress
SET status = CASE
  WHEN completed_at IS NOT NULL THEN 'completed'::public.lesson_progress_status
  ELSE 'in_progress'::public.lesson_progress_status
END
WHERE status = 'not_started';

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_lesson ON public.lesson_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_status ON public.lesson_progress(status);

-- ─── 6. Extend challenge_progress ────────────────────────────────────────────

-- Add current_attempt_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'challenge_progress' AND column_name = 'current_attempt_id'
  ) THEN
    ALTER TABLE public.challenge_progress ADD COLUMN current_attempt_id uuid REFERENCES public.challenge_attempts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add earned_xp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'challenge_progress' AND column_name = 'earned_xp'
  ) THEN
    ALTER TABLE public.challenge_progress ADD COLUMN earned_xp integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'challenge_progress' AND column_name = 'id'
  ) THEN
    ALTER TABLE public.challenge_progress ADD COLUMN id uuid DEFAULT gen_random_uuid();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_challenge_progress_user ON public.challenge_progress(user_id, challenge_id);

-- ─── 7. module_progress ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.module_progress (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_id            uuid        NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  status               public.module_status NOT NULL DEFAULT 'locked',
  completion_percentage integer    NOT NULL DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  completed_lessons    integer     NOT NULL DEFAULT 0,
  total_lessons        integer     NOT NULL DEFAULT 0,
  completed_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at           timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT module_progress_unique UNIQUE (user_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_module_progress_user    ON public.module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_module  ON public.module_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_status  ON public.module_progress(status);

-- ─── 8. learning_path_progress ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.learning_path_progress (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  learning_path_id      uuid        NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  completion_percentage integer     NOT NULL DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  completed_modules     integer     NOT NULL DEFAULT 0,
  completed_lessons     integer     NOT NULL DEFAULT 0,
  completed_challenges  integer     NOT NULL DEFAULT 0,
  current_module_id     uuid        REFERENCES public.learning_modules(id) ON DELETE SET NULL,
  current_lesson_id     uuid        REFERENCES public.lessons(id) ON DELETE SET NULL,
  current_challenge_id  uuid        REFERENCES public.challenges(id) ON DELETE SET NULL,
  last_activity_at      timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at            timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at            timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT learning_path_progress_unique UNIQUE (user_id, learning_path_id)
);

CREATE INDEX IF NOT EXISTS idx_lpp_user          ON public.learning_path_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lpp_path          ON public.learning_path_progress(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_lpp_last_activity ON public.learning_path_progress(last_activity_at DESC);

-- ─── 9. Triggers — updated_at ────────────────────────────────────────────────

DROP TRIGGER IF EXISTS set_learning_modules_updated_at ON public.learning_modules;
CREATE TRIGGER set_learning_modules_updated_at
  BEFORE UPDATE ON public.learning_modules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_module_progress_updated_at ON public.module_progress;
CREATE TRIGGER set_module_progress_updated_at
  BEFORE UPDATE ON public.module_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_lpp_updated_at ON public.learning_path_progress;
CREATE TRIGGER set_lpp_updated_at
  BEFORE UPDATE ON public.learning_path_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_lesson_progress_updated_at ON public.lesson_progress;
CREATE TRIGGER set_lesson_progress_updated_at
  BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 10. RLS — learning_modules ──────────────────────────────────────────────

ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modules_select_published" ON public.learning_modules;
CREATE POLICY "modules_select_published"
  ON public.learning_modules FOR SELECT TO authenticated
  USING (
    (is_published = true AND EXISTS (
      SELECT 1 FROM public.learning_paths lp
      WHERE lp.id = learning_path_id AND lp.is_active = true
    ))
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "modules_insert_admin" ON public.learning_modules;
CREATE POLICY "modules_insert_admin"
  ON public.learning_modules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "modules_update_admin" ON public.learning_modules;
CREATE POLICY "modules_update_admin"
  ON public.learning_modules FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "modules_delete_admin" ON public.learning_modules;
CREATE POLICY "modules_delete_admin"
  ON public.learning_modules FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ─── 11. RLS — module_progress ───────────────────────────────────────────────

ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "module_progress_select_own" ON public.module_progress;
CREATE POLICY "module_progress_select_own"
  ON public.module_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "module_progress_insert_own" ON public.module_progress;
CREATE POLICY "module_progress_insert_own"
  ON public.module_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "module_progress_update_own" ON public.module_progress;
CREATE POLICY "module_progress_update_own"
  ON public.module_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ─── 12. RLS — learning_path_progress ────────────────────────────────────────

ALTER TABLE public.learning_path_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lpp_select_own" ON public.learning_path_progress;
CREATE POLICY "lpp_select_own"
  ON public.learning_path_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "lpp_insert_own" ON public.learning_path_progress;
CREATE POLICY "lpp_insert_own"
  ON public.learning_path_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "lpp_update_own" ON public.learning_path_progress;
CREATE POLICY "lpp_update_own"
  ON public.learning_path_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ─── 13. Grants ───────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_modules       TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON public.module_progress         TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON public.learning_path_progress  TO authenticated;

-- ─── Done ──────────────────────────────────────────────────────────────────────
-- After running this migration in Supabase SQL Editor:
--   1. Regenerate types:
--      npx supabase gen types typescript --project-id YOUR_ID --schema public > src/types/database.types.ts
--   2. Restart dev server: npm run dev
-- ───────────────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

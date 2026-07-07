-- ============================================================
-- TestCraft — 004_learning_system_foundation.sql
-- Learning Paths, Lessons, Lesson Progress, Challenge linking
-- ============================================================
-- This migration is idempotent — safe to re-run.
-- ============================================================

-- ─── 1. Learning Paths ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.learning_paths (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text        NOT NULL,
  slug        text        UNIQUE NOT NULL,
  is_active   boolean     NOT NULL DEFAULT true,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT learning_paths_title_min   CHECK (char_length(trim(title)) >= 3),
  CONSTRAINT learning_paths_desc_min    CHECK (char_length(trim(description)) >= 10),
  CONSTRAINT learning_paths_sort_order  CHECK (sort_order >= 0)
);

-- ─── 2. Lessons ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lessons (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_path_id  uuid        NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  title             text        NOT NULL,
  slug              text        NOT NULL,
  summary           text,
  content           text        NOT NULL,
  objectives        text[]      NOT NULL DEFAULT '{}',
  estimated_minutes integer     NOT NULL DEFAULT 10,
  difficulty        difficulty_level NOT NULL DEFAULT 'Beginner',
  sort_order        integer     NOT NULL DEFAULT 0,
  is_published      boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at        timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT lessons_title_min       CHECK (char_length(trim(title)) >= 3),
  CONSTRAINT lessons_content_min     CHECK (char_length(trim(content)) >= 30),
  CONSTRAINT lessons_est_minutes     CHECK (estimated_minutes BETWEEN 1 AND 240),
  CONSTRAINT lessons_sort_order      CHECK (sort_order >= 0),
  CONSTRAINT lessons_unique_slug     UNIQUE (learning_path_id, slug)
);

-- ─── 3. Lesson Progress ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  user_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id      uuid        NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at   timestamptz,
  last_opened_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),

  PRIMARY KEY (user_id, lesson_id)
);

-- ─── 4. Extend challenges table ───────────────────────────────────────────
-- Add columns safely using DO blocks to avoid errors if they already exist.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'lesson_id'
  ) THEN
    ALTER TABLE public.challenges ADD COLUMN lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'challenge_type'
  ) THEN
    ALTER TABLE public.challenges ADD COLUMN challenge_type text NOT NULL DEFAULT 'bug_report';
    ALTER TABLE public.challenges ADD CONSTRAINT challenges_type_values
      CHECK (challenge_type IN ('bug_report', 'test_cases', 'api_testing', 'automation'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'scenario'
  ) THEN
    ALTER TABLE public.challenges ADD COLUMN scenario text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'instructions'
  ) THEN
    ALTER TABLE public.challenges ADD COLUMN instructions text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'lab_template'
  ) THEN
    ALTER TABLE public.challenges ADD COLUMN lab_template text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE public.challenges ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ─── 5. RLS Policies — learning_paths ─────────────────────────────────────

ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active paths
CREATE POLICY "learning_paths_select_active"
  ON public.learning_paths FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admins can insert
CREATE POLICY "learning_paths_insert_admin"
  ON public.learning_paths FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admins can update
CREATE POLICY "learning_paths_update_admin"
  ON public.learning_paths FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admins can delete
CREATE POLICY "learning_paths_delete_admin"
  ON public.learning_paths FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ─── 6. RLS Policies — lessons ────────────────────────────────────────────

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read published lessons (or admins can read all)
CREATE POLICY "lessons_select_published"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (
    (is_published = true AND EXISTS (
      SELECT 1 FROM public.learning_paths lp
      WHERE lp.id = learning_path_id AND lp.is_active = true
    ))
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admins can insert
CREATE POLICY "lessons_insert_admin"
  ON public.lessons FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admins can update
CREATE POLICY "lessons_update_admin"
  ON public.lessons FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admins can delete
CREATE POLICY "lessons_delete_admin"
  ON public.lessons FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ─── 7. RLS Policies — lesson_progress ────────────────────────────────────

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Users can read their own progress
CREATE POLICY "lesson_progress_select_own"
  ON public.lesson_progress FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Users can insert their own progress
CREATE POLICY "lesson_progress_insert_own"
  ON public.lesson_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own progress
CREATE POLICY "lesson_progress_update_own"
  ON public.lesson_progress FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ─── 8. Triggers — updated_at ─────────────────────────────────────────────
-- Reuse existing set_updated_at() function from 001_create_profiles.sql

DROP TRIGGER IF EXISTS set_learning_paths_updated_at ON public.learning_paths;
CREATE TRIGGER set_learning_paths_updated_at
  BEFORE UPDATE ON public.learning_paths
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_lessons_updated_at ON public.lessons;
CREATE TRIGGER set_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ─── 9. Grants ────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_paths TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lesson_progress TO authenticated;

-- ─── Done ──────────────────────────────────────────────────────────────────
-- After running this migration:
--   1. Verify tables in Supabase Dashboard → Table Editor
--   2. Regenerate types:
--      npx supabase gen types typescript --project-id gpqebvkpvdrcqvucbjgr --schema public > src/types/database.types.ts
--   3. Restart dev server
-- ────────────────────────────────────────────────────────────────────────────

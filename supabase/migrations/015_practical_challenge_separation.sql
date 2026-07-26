-- ============================================================
-- TestCraft — 015_practical_challenge_separation.sql
-- Introduces workflow_type to cleanly separate Legacy challenges
-- from the new Practical Challenge system.
--
-- Rules:
--   - All existing challenges default to 'legacy'.
--   - New Practical Challenges always set workflow_type = 'practical'.
--   - The Login Form Bug Hunt is safe-migrated to 'practical'.
-- ============================================================

-- 1. Add workflow_type column to challenges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'workflow_type'
  ) THEN
    ALTER TABLE public.challenges
      ADD COLUMN workflow_type text NOT NULL DEFAULT 'legacy';
  END IF;
END $$;

-- 2. Add CHECK constraint to enforce valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public'
      AND table_name = 'challenges'
      AND constraint_name = 'challenges_workflow_type_check'
  ) THEN
    ALTER TABLE public.challenges
      ADD CONSTRAINT challenges_workflow_type_check
      CHECK (workflow_type IN ('legacy', 'practical'));
  END IF;
END $$;

-- 3. Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_challenges_workflow_type ON public.challenges(workflow_type);

-- 4. Safe migration: promote Login Form Bug Hunt to 'practical'
-- Only if it has: a module_id, a valid practical_app_key, and a unique slug.
UPDATE public.challenges
SET workflow_type = 'practical'
WHERE
  (slug = 'login-form-bug-hunt' OR title_en = 'Login Form Bug Hunt')
  AND practical_app_key = 'login_form'
  AND module_id IS NOT NULL
  AND workflow_type = 'legacy';

-- 5. Any challenge that already has practical_app_key set and challenge_type = 'interactive_bug_hunt'
-- can also be promoted safely (catches any other practical challenges created before this migration).
UPDATE public.challenges
SET workflow_type = 'practical'
WHERE
  practical_app_key IS NOT NULL
  AND challenge_type = 'interactive_bug_hunt'
  AND workflow_type = 'legacy';

-- 6. Add a status column for publishing state (if not already present)
-- Values: 'draft' | 'published' | 'archived'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.challenges
      ADD COLUMN status text NOT NULL DEFAULT 'draft';

    ALTER TABLE public.challenges
      ADD CONSTRAINT challenges_status_check
      CHECK (status IN ('draft', 'published', 'archived'));
  END IF;
END $$;

-- 7. Map existing is_active to status (safe backfill):
-- is_active = true AND status = 'draft'  → 'published'
-- is_active = false AND status = 'draft' → keep 'draft'
UPDATE public.challenges
SET status = 'published'
WHERE is_active = true AND status = 'draft';

-- 8. Index on status for fast tester queries
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges(status);

-- Done
NOTIFY pgrst, 'reload schema';

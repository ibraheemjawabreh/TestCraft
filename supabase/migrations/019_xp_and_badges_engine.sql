-- ============================================================
-- TestCraft ── 019_xp_and_badges_engine.sql
-- Introduces the automatic XP, Level, Rank, and Badge system.
--
-- Rules:
--   - ADDITIVE ONLY. Zero data deletion.
--   - Existing total_xp and current_level in profiles are preserved.
--   - New xp_transactions table becomes the source of truth.
--   - Idempotency enforced via unique constraints.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. xp_transactions table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type text        NOT NULL,
  source_id   uuid,
  amount      integer     NOT NULL CHECK (amount > 0),
  reason      text        NOT NULL,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT xp_transactions_source_type_check
    CHECK (source_type IN ('lesson', 'challenge_attempt', 'badge', 'admin_adjustment')),

  CONSTRAINT xp_transactions_reason_check
    CHECK (reason IN (
      'lesson_completed',
      'challenge_approved',
      'bug_bonus',
      'perfect_challenge',
      'badge_earned',
      'admin_adjustment'
    ))
);

-- Unique constraints to prevent double-awarding
-- Lesson XP: one per user+lesson
CREATE UNIQUE INDEX IF NOT EXISTS xp_transactions_lesson_unique
  ON public.xp_transactions (user_id, source_id, reason)
  WHERE source_type = 'lesson' AND reason = 'lesson_completed';

-- Challenge base XP: one per user+attempt
CREATE UNIQUE INDEX IF NOT EXISTS xp_transactions_challenge_approved_unique
  ON public.xp_transactions (user_id, source_id, reason)
  WHERE source_type = 'challenge_attempt' AND reason = 'challenge_approved';

-- Perfect bonus: one per user+attempt
CREATE UNIQUE INDEX IF NOT EXISTS xp_transactions_perfect_bonus_unique
  ON public.xp_transactions (user_id, source_id, reason)
  WHERE source_type = 'challenge_attempt' AND reason = 'perfect_challenge';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON public.xp_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON public.xp_transactions (created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 2. Extend challenge_attempts with xp_awarded guard
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'challenge_attempts' AND column_name = 'xp_awarded'
  ) THEN
    ALTER TABLE public.challenge_attempts
      ADD COLUMN xp_awarded boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'challenge_attempts' AND column_name = 'awarded_xp'
  ) THEN
    ALTER TABLE public.challenge_attempts
      ADD COLUMN awarded_xp integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Backfill: existing approved attempts that already have earned_xp > 0
-- are considered "already awarded" to prevent double-awarding
UPDATE public.challenge_attempts
SET xp_awarded = true, awarded_xp = COALESCE(earned_xp, 0)
WHERE status = 'approved'
  AND COALESCE(earned_xp, 0) > 0
  AND xp_awarded = false;

-- ─────────────────────────────────────────────────────────────
-- 3. Extend bug_reports with matched_hidden_bug_id
--    (allows admin to link a report to a specific intentional bug)
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bug_reports' AND column_name = 'matched_hidden_bug_id'
  ) THEN
    ALTER TABLE public.bug_reports
      ADD COLUMN matched_hidden_bug_id uuid REFERENCES public.hidden_bugs(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bug_reports' AND column_name = 'admin_classification'
  ) THEN
    ALTER TABLE public.bug_reports
      ADD COLUMN admin_classification text;

    ALTER TABLE public.bug_reports
      ADD CONSTRAINT bug_reports_admin_classification_check
      CHECK (admin_classification IS NULL OR admin_classification IN (
        'valid_bug', 'duplicate', 'not_a_bug', 'needs_improvement'
      ));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4. Seed badges table
-- ─────────────────────────────────────────────────────────────

-- Add badge_key column for programmatic lookup (safe additive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'badges' AND column_name = 'badge_key'
  ) THEN
    ALTER TABLE public.badges
      ADD COLUMN badge_key text UNIQUE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'badges' AND column_name = 'name_ar'
  ) THEN
    ALTER TABLE public.badges
      ADD COLUMN name_ar text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'badges' AND column_name = 'description_ar'
  ) THEN
    ALTER TABLE public.badges
      ADD COLUMN description_ar text;
  END IF;
END $$;

-- Seed the 6 MVP badges (idempotent via ON CONFLICT)
INSERT INTO public.badges (badge_key, name, name_ar, description, description_ar)
VALUES
  (
    'first_lesson_completed',
    'First Lesson Completed',
    'أول درس مكتمل',
    'Awarded for completing your very first lesson.',
    'يُمنح عند إتمام أول درس لك.'
  ),
  (
    'first_bug_report',
    'First Bug Report',
    'أول تقرير خطأ',
    'Awarded for submitting your first bug report.',
    'يُمنح عند إرسال أول تقرير خطأ لك.'
  ),
  (
    'first_approved_challenge',
    'First Approved Challenge',
    'أول تحدي معتمد',
    'Awarded when your first challenge attempt is approved.',
    'يُمنح عند اعتماد أول محاولة تحدٍّ لك.'
  ),
  (
    'perfect_bug_hunt',
    'Perfect Bug Hunt',
    'صائد الأخطاء المثالي',
    'Awarded for finding all intentional bugs in a challenge.',
    'يُمنح عند اكتشاف جميع الأخطاء المتعمدة في تحدٍّ واحد.'
  ),
  (
    'three_challenges_completed',
    'Three Challenges Completed',
    'إكمال ثلاثة تحديات',
    'Awarded for having 3 approved challenge attempts.',
    'يُمنح عند الحصول على 3 محاولات تحدٍّ معتمدة.'
  ),
  (
    'ten_valid_bug_reports',
    'Ten Valid Bug Reports',
    'عشرة تقارير صحيحة',
    'Awarded for submitting 10 valid and approved bug reports.',
    'يُمنح عند تقديم 10 تقارير أخطاء صحيحة ومعتمدة.'
  )
ON CONFLICT (badge_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 5. RLS policies for xp_transactions
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

-- Testers can only read their own transactions
DROP POLICY IF EXISTS "xp_transactions_tester_read_own" ON public.xp_transactions;
CREATE POLICY "xp_transactions_tester_read_own"
  ON public.xp_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only server (service_role) or admins can insert/update/delete
DROP POLICY IF EXISTS "xp_transactions_admin_all" ON public.xp_transactions;
CREATE POLICY "xp_transactions_admin_all"
  ON public.xp_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 6. user_badges RLS for reading earned badges
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_badges_tester_read_own" ON public.user_badges;
CREATE POLICY "user_badges_tester_read_own"
  ON public.user_badges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_badges_admin_all" ON public.user_badges;
CREATE POLICY "user_badges_admin_all"
  ON public.user_badges
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Done
NOTIFY pgrst, 'reload schema';

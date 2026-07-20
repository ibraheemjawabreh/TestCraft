-- ============================================================
-- TestCraft — 012_challenge_lab_engine.sql
-- Introduces the Lab Template system for reusable challenge labs.
-- Architecture: Challenge → Lab Template → Interactive Lab → Bug Reports
-- ============================================================
-- Safe to re-run (idempotent — uses IF NOT EXISTS everywhere).
-- ============================================================

-- ─── 1. lab_templates table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lab_templates (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en         text        NOT NULL,
  name_ar         text,
  description_en  text,
  description_ar  text,
  slug            text        NOT NULL UNIQUE,
  lab_type        text        NOT NULL DEFAULT 'login_form',
  configuration   jsonb       NOT NULL DEFAULT '{}',
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at      timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT lab_templates_name_min CHECK (char_length(trim(name_en)) >= 2),
  CONSTRAINT lab_templates_slug_min CHECK (char_length(trim(slug)) >= 2)
);

CREATE INDEX IF NOT EXISTS idx_lab_templates_slug     ON public.lab_templates(slug);
CREATE INDEX IF NOT EXISTS idx_lab_templates_is_active ON public.lab_templates(is_active);

DROP TRIGGER IF EXISTS set_lab_templates_updated_at ON public.lab_templates;
CREATE TRIGGER set_lab_templates_updated_at
  BEFORE UPDATE ON public.lab_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 2. Add lab_template_id to challenges ─────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'lab_template_id'
  ) THEN
    ALTER TABLE public.challenges
      ADD COLUMN lab_template_id uuid REFERENCES public.lab_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_challenges_lab_template_id ON public.challenges(lab_template_id);

-- ─── 3. Add lab_template_id to bug_reports ────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bug_reports' AND column_name = 'lab_template_id'
  ) THEN
    ALTER TABLE public.bug_reports
      ADD COLUMN lab_template_id uuid REFERENCES public.lab_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── 4. Extend hidden_bugs table ──────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hidden_bugs' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.hidden_bugs ADD COLUMN description text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hidden_bugs' AND column_name = 'bug_identifier'
  ) THEN
    ALTER TABLE public.hidden_bugs ADD COLUMN bug_identifier text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hidden_bugs' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.hidden_bugs ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hidden_bugs_challenge_id ON public.hidden_bugs(challenge_id);
CREATE INDEX IF NOT EXISTS idx_hidden_bugs_is_active    ON public.hidden_bugs(is_active);

-- ─── 5. RLS — lab_templates ───────────────────────────────────────────────────

ALTER TABLE public.lab_templates ENABLE ROW LEVEL SECURITY;

-- Testers can read active labs
DROP POLICY IF EXISTS "lab_templates_select_active" ON public.lab_templates;
CREATE POLICY "lab_templates_select_active"
  ON public.lab_templates FOR SELECT TO authenticated
  USING (
    is_active = true
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can insert/update/delete
DROP POLICY IF EXISTS "lab_templates_admin_all" ON public.lab_templates;
CREATE POLICY "lab_templates_admin_all"
  ON public.lab_templates FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── 6. RLS — hidden_bugs (ADMIN ONLY — never expose to testers) ──────────────

ALTER TABLE public.hidden_bugs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hidden_bugs_admin_only" ON public.hidden_bugs;
CREATE POLICY "hidden_bugs_admin_only"
  ON public.hidden_bugs FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── 7. Grants ────────────────────────────────────────────────────────────────

GRANT SELECT ON public.lab_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lab_templates TO authenticated;

-- ─── 8. Seed — Login Form Bug Hunt lab template ───────────────────────────────

INSERT INTO public.lab_templates (
  name_en,
  name_ar,
  description_en,
  description_ar,
  slug,
  lab_type,
  configuration,
  is_active
)
VALUES (
  'Login Form Bug Hunt',
  'اختبار نموذج تسجيل الدخول',
  'A realistic login form with intentional hidden bugs for testers to discover. Tests email validation, password rules, error messaging, and forgot password flow.',
  'نموذج تسجيل دخول واقعي يحتوي على أخطاء مخفية ليكتشفها المختبرون. يختبر التحقق من البريد الإلكتروني وقواعد كلمة المرور ورسائل الخطأ وتدفق نسيان كلمة المرور.',
  'login-form-bug-hunt',
  'login_form',
  '{"bugs": ["email_validation_bypass", "empty_password_no_error", "forgot_password_silent_fail", "repeated_submit_no_throttle", "generic_error_message"]}',
  true
)
ON CONFLICT (slug) DO NOTHING;

-- ─── Done ─────────────────────────────────────────────────────────────────────
-- After running this migration in Supabase SQL Editor:
--   1. Regenerate types:
--      npx supabase gen types typescript --project-id YOUR_ID --schema public > src/types/database.types.ts
--   2. Restart dev server: npm run dev
-- ──────────────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- TestCraft — 013_practical_challenges.sql
-- Simplifies the Challenge system by removing Lab Templates
-- and using a developer-owned Practical Application Registry.
-- ============================================================

-- 1. Add practical_app_key and practical_app_config to challenges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'practical_app_key'
  ) THEN
    ALTER TABLE public.challenges ADD COLUMN practical_app_key text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'practical_app_config'
  ) THEN
    ALTER TABLE public.challenges ADD COLUMN practical_app_config jsonb NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- 2. Add bug_key to hidden_bugs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hidden_bugs' AND column_name = 'bug_key'
  ) THEN
    ALTER TABLE public.hidden_bugs ADD COLUMN bug_key text;
  END IF;
END $$;

-- 3. Data Mapping: migrate existing login_form lab_templates to practical_app_key
-- We'll assume the lab_templates still exist for a moment and just update the challenges
DO $$
BEGIN
  UPDATE public.challenges c
  SET 
    practical_app_key = 'login_form',
    practical_app_config = '{"validEmail": "qa.tester@testcraft.dev", "validPassword": "Test@12345"}'::jsonb
  FROM public.lab_templates lt
  WHERE c.lab_template_id = lt.id 
    AND lt.lab_type = 'login_form'
    AND c.practical_app_key IS NULL;
END $$;

-- PHASE 15 — EXISTING LOGIN CHALLENGE MIGRATION
DO $$
DECLARE
  v_challenge_id uuid;
BEGIN
  -- Locate the Login Form Bug Hunt challenge
  SELECT id INTO v_challenge_id
  FROM public.challenges
  WHERE slug = 'login-form-bug-hunt' OR title_en = 'Login Form Bug Hunt'
  LIMIT 1;

  IF v_challenge_id IS NOT NULL THEN
    -- Update the challenge
    UPDATE public.challenges
    SET
      challenge_type = 'interactive_bug_hunt',
      practical_app_key = 'login_form',
      practical_app_config = '{"validEmail": "qa.tester@testcraft.dev", "validPassword": "Test@12345"}'::jsonb
    WHERE id = v_challenge_id;

    -- Map existing bugs (if any) or just insert the new preset bugs if none match exactly
    -- We can just ensure the 4 bugs exist for this challenge to be safe, since they were requested.
    -- If there's an existing bug with similar title, we could update its bug_key.
    UPDATE public.hidden_bugs
    SET bug_key = 'invalid_email_validation_missing'
    WHERE challenge_id = v_challenge_id AND title_en ILIKE '%email%format%';

    UPDATE public.hidden_bugs
    SET bug_key = 'forgot_password_no_action'
    WHERE challenge_id = v_challenge_id AND title_en ILIKE '%forgot%password%';

    UPDATE public.hidden_bugs
    SET bug_key = 'repeated_submission_allowed'
    WHERE challenge_id = v_challenge_id AND title_en ILIKE '%repeated%';

    UPDATE public.hidden_bugs
    SET bug_key = 'short_password_validation_missing'
    WHERE challenge_id = v_challenge_id AND title_en ILIKE '%short%password%';
    
    -- Insert missing bugs if they don't exist
    INSERT INTO public.hidden_bugs (challenge_id, bug_key, title_en, title_ar, description, severity, bonus_xp, is_active)
    SELECT v_challenge_id, 'invalid_email_validation_missing', 'Invalid email format is not validated', 'عدم التحقق من صيغة البريد الإلكتروني', '', 'Medium', 25, true
    WHERE NOT EXISTS (SELECT 1 FROM public.hidden_bugs WHERE challenge_id = v_challenge_id AND bug_key = 'invalid_email_validation_missing');

    INSERT INTO public.hidden_bugs (challenge_id, bug_key, title_en, title_ar, description, severity, bonus_xp, is_active)
    SELECT v_challenge_id, 'forgot_password_no_action', 'Forgot Password does not respond', 'رابط نسيت كلمة المرور لا يستجيب', '', 'Low', 15, true
    WHERE NOT EXISTS (SELECT 1 FROM public.hidden_bugs WHERE challenge_id = v_challenge_id AND bug_key = 'forgot_password_no_action');

    INSERT INTO public.hidden_bugs (challenge_id, bug_key, title_en, title_ar, description, severity, bonus_xp, is_active)
    SELECT v_challenge_id, 'repeated_submission_allowed', 'Login allows repeated submissions', 'نموذج تسجيل الدخول يسمح بالإرسال المتكرر', '', 'Low', 15, true
    WHERE NOT EXISTS (SELECT 1 FROM public.hidden_bugs WHERE challenge_id = v_challenge_id AND bug_key = 'repeated_submission_allowed');

    INSERT INTO public.hidden_bugs (challenge_id, bug_key, title_en, title_ar, description, severity, bonus_xp, is_active)
    SELECT v_challenge_id, 'short_password_validation_missing', 'Very short passwords are not validated', 'عدم التحقق من كلمات المرور القصيرة جدًا', '', 'Medium', 25, true
    WHERE NOT EXISTS (SELECT 1 FROM public.hidden_bugs WHERE challenge_id = v_challenge_id AND bug_key = 'short_password_validation_missing');
  END IF;
END $$;

-- Notice: We are keeping the old lab_template_id around for now so we don't break existing views,
-- but the new system will rely entirely on practical_app_key and practical_app_config.

NOTIFY pgrst, 'reload schema';

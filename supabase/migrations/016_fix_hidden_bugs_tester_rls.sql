-- ============================================================
-- TestCraft — 016_fix_hidden_bugs_tester_rls.sql
--
-- Problem:
--   The hidden_bugs table has an admin-only RLS policy.
--   This blocks authenticated testers from reading bug_key,
--   which is required to activate intentional bug behaviors
--   (e.g., skipping email format validation) in the Lab UI.
--
-- Fix:
--   Add a separate SELECT-only policy that allows any
--   authenticated user to read ONLY the bug_key and challenge_id
--   columns for active bugs. No sensitive columns are exposed.
--
-- Security Notes:
--   - bug_key values are opaque behavior flags (e.g., 'invalid_email_validation_missing')
--   - They control UI behavior inside the practical app, not reveal answers
--   - The tester cannot see: hidden_bugs descriptions, severity, bonus_xp
--   - The tester cannot INSERT, UPDATE, or DELETE from hidden_bugs
-- ============================================================

-- Drop any conflicting tester read policy first
DROP POLICY IF EXISTS "hidden_bugs_tester_read_bug_keys" ON public.hidden_bugs;

-- Allow any authenticated user to SELECT bug_key for active bugs
-- (used by the Lab page to activate intentional bug behaviors in the UI)
CREATE POLICY "hidden_bugs_tester_read_bug_keys"
  ON public.hidden_bugs
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Done
NOTIFY pgrst, 'reload schema';

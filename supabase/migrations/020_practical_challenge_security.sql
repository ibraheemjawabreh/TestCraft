-- Additive security repair. No curriculum/user/progress rows are removed.
begin;
-- Migration 016 mistakenly gave row access to all hidden bug columns.
drop policy if exists "hidden_bugs_tester_read_bug_keys" on public.hidden_bugs;
-- Supabase service_role is used ONLY inside the server-side simulation adapter.
-- Explicit column grants prevent public challenge metadata from carrying private configuration.
revoke select on public.hidden_bugs from anon, authenticated;
grant select, insert, update, delete on public.hidden_bugs to authenticated;
-- Existing admin-only RLS policies remain in force.
commit;


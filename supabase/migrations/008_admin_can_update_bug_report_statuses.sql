-- Allow an admin review to update the status visible to the tester.
-- Migration 007 grants the admin SELECT access to bug reports but not UPDATE access.

drop policy if exists "bug_reports_update_all_admin" on public.bug_reports;

create policy "bug_reports_update_all_admin"
  on public.bug_reports
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

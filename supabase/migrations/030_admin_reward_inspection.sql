begin;
-- Reviewers must be able to inspect the rewards they awarded to another learner.
create policy curriculum_profiles_admin_read on public.profiles for select to authenticated using(public.curriculum_is_admin());
create policy curriculum_xp_admin_read on public.xp_transactions for select to authenticated using(public.curriculum_is_admin());
create policy curriculum_badges_admin_read on public.user_badges for select to authenticated using(public.curriculum_is_admin());
commit;
notify pgrst,'reload schema';


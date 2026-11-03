begin;
create or replace function public.curriculum_protect_report_review() returns trigger language plpgsql set search_path=public as $$
declare j jsonb;
begin
 if current_user in ('postgres','service_role','supabase_admin') or public.curriculum_is_admin() then return new; end if;
 j:=to_jsonb(new);
 if new.user_id is distinct from auth.uid() then raise exception 'Report owner mismatch'; end if;
 if tg_op='INSERT' then
  if coalesce(j->>'status','Pending')<>'Pending' or j->>'admin_classification' is not null or j->>'admin_score' is not null
   or j->>'admin_feedback' is not null or j->>'reviewed_by' is not null or j->>'reviewed_at' is not null
   or j->>'matched_hidden_bug_id' is not null then raise exception 'Report review fields are admin-only'; end if;
  if not exists(select 1 from public.challenges c where c.id=new.challenge_id and c.is_active
    and (c.module_id is null or public.curriculum_can_read_module(c.module_id))) then raise exception 'Challenge unavailable'; end if;
  if new.attempt_id is not null and not exists(select 1 from public.challenge_attempts a where a.id=new.attempt_id
   and a.user_id=auth.uid() and a.challenge_id=new.challenge_id and a.status::text in ('started','submitted')) then raise exception 'Invalid active attempt'; end if;
 else
  if (to_jsonb(new)-array['title','steps_to_reproduce','expected_result','actual_result','reported_severity','environment','evidence_url'])
   is distinct from (to_jsonb(old)-array['title','steps_to_reproduce','expected_result','actual_result','reported_severity','environment','evidence_url'])
   or old.status::text<>'Pending' then raise exception 'Report review fields are admin-only'; end if;
 end if;
 return new;
end $$;
create trigger curriculum_protect_report_review before insert or update on public.bug_reports
 for each row execute function public.curriculum_protect_report_review();
commit;
notify pgrst,'reload schema';


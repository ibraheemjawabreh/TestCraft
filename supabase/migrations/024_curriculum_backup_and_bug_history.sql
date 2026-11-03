begin;
create or replace function public.curriculum_backup() returns uuid
language plpgsql security definer set search_path=public as $$
declare bid uuid;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 insert into public.curriculum_backups(created_by,payload)
 values(auth.uid(),jsonb_build_object('format','testcraft-master-backup-v1','exported_at',now(),
 'learning_paths',coalesce((select jsonb_agg(to_jsonb(t)) from public.learning_paths t),'[]'),
 'learning_modules',coalesce((select jsonb_agg(to_jsonb(t)) from public.learning_modules t),'[]'),
 'lessons',coalesce((select jsonb_agg(to_jsonb(t)) from public.lessons t),'[]'),
 'activities',coalesce((select jsonb_agg(to_jsonb(t)) from public.lesson_activities t),'[]'),
 'sources',coalesce((select jsonb_agg(to_jsonb(t)) from public.curriculum_sources t),'[]'),
 'versions',coalesce((select jsonb_agg(to_jsonb(t)) from public.curriculum_versions t),'[]'),
 'challenges',coalesce((select jsonb_agg(to_jsonb(t)) from public.challenges t),'[]'),
 'hidden_bugs',coalesce((select jsonb_agg(to_jsonb(t)) from public.hidden_bugs t),'[]')))
 returning id into bid; return bid;
end $$;

-- This restores curriculum only into an EMPTY, explicitly enabled TEST database.
-- Existing student records/XP/attempts are neither exported nor overwritten.
create or replace function public.curriculum_restore_test_backup(p_payload jsonb,p_confirmation text) returns jsonb
language plpgsql security invoker set search_path=public as $$
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 if current_setting('testcraft.allow_restore',true) is distinct from 'on' or p_confirmation<>'RESTORE_EMPTY_TEST_DATABASE' then
  raise exception 'Test database restore is not enabled'; end if;
 if p_payload->>'format'<>'testcraft-master-backup-v1' then raise exception 'Unsupported backup'; end if;
 perform pg_advisory_xact_lock(hashtext('testcraft-curriculum-import'));
 if exists(select 1 from public.learning_paths) or exists(select 1 from public.lessons) or exists(select 1 from public.challenges) then
  raise exception 'Restore requires empty curriculum and challenges'; end if;
 insert into public.learning_paths select * from jsonb_populate_recordset(null::public.learning_paths,p_payload->'learning_paths');
 insert into public.learning_modules select * from jsonb_populate_recordset(null::public.learning_modules,p_payload->'learning_modules');
 insert into public.lessons select * from jsonb_populate_recordset(null::public.lessons,p_payload->'lessons');
 insert into public.challenges select * from jsonb_populate_recordset(null::public.challenges,p_payload->'challenges');
 insert into public.hidden_bugs select * from jsonb_populate_recordset(null::public.hidden_bugs,p_payload->'hidden_bugs');
 insert into public.lesson_activities select * from jsonb_populate_recordset(null::public.lesson_activities,p_payload->'activities');
 insert into public.curriculum_sources select * from jsonb_populate_recordset(null::public.curriculum_sources,
  (select coalesce(jsonb_agg(value||jsonb_build_object('created_by',auth.uid())),'[]') from jsonb_array_elements(p_payload->'sources')));
 insert into public.curriculum_versions select * from jsonb_populate_recordset(null::public.curriculum_versions,
  (select coalesce(jsonb_agg(value||jsonb_build_object('created_by',auth.uid())),'[]') from jsonb_array_elements(p_payload->'versions')));
 -- Restoration approval does not publish teaching content.
 update public.learning_paths set is_active=false;
 update public.learning_modules set is_published=false;
 update public.lessons set is_published=false;
 update public.challenges set is_active=false,status='draft';
 update public.lesson_activities set is_published=false;
 return jsonb_build_object('paths',(select count(*) from public.learning_paths),'lessons',(select count(*) from public.lessons),
 'activities',(select count(*) from public.lesson_activities),'published',0);
end $$;

-- Synchronize presets transactionally while retaining old bug IDs and report references.
create or replace function public.curriculum_sync_bugs(p_challenge uuid,p_bugs jsonb) returns integer
language plpgsql security invoker set search_path=public as $$
declare b jsonb; bid uuid; n integer:=0;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 perform 1 from public.challenges where id=p_challenge for update;
 if not found then raise exception 'Challenge not found'; end if;
 if (select count(*) from jsonb_array_elements(p_bugs))<>(select count(distinct value->>'bug_key') from jsonb_array_elements(p_bugs)) then raise exception 'Duplicate bug keys'; end if;
 update public.hidden_bugs set is_active=false where challenge_id=p_challenge;
 for b in select value from jsonb_array_elements(p_bugs) loop
  bid:=null;
  select id into bid from public.hidden_bugs where challenge_id=p_challenge and bug_key=b->>'bug_key' order by id limit 1;
  if bid is null then
   insert into public.hidden_bugs(challenge_id,bug_key,bug_title,description,actual_severity,bonus_xp,is_active)
   values(p_challenge,b->>'bug_key',b->>'bug_title',b->>'description',(b->>'actual_severity')::public.severity_level,(b->>'bonus_xp')::integer,(b->>'is_active')::boolean);
  else
   update public.hidden_bugs set bug_title=b->>'bug_title',description=b->>'description',actual_severity=(b->>'actual_severity')::public.severity_level,
    bonus_xp=(b->>'bonus_xp')::integer,is_active=(b->>'is_active')::boolean where id=bid;
  end if;
  n:=n+1;
 end loop;
 return n;
end $$;
revoke all on function public.curriculum_restore_test_backup(jsonb,text),public.curriculum_sync_bugs(uuid,jsonb) from public,anon;
grant execute on function public.curriculum_restore_test_backup(jsonb,text),public.curriculum_sync_bugs(uuid,jsonb) to authenticated;
commit;
notify pgrst,'reload schema';


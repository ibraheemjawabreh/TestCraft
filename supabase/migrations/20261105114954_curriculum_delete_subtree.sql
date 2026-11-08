-- Install admin-only deletion capabilities. Installing this migration deletes no rows.
begin;

create or replace function public.curriculum_deletion_preview(p_kind text,p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare root jsonb; mids uuid[]:='{}'; lids uuid[]:='{}'; aids uuid[]:='{}'; parents uuid[]:='{}'; modules_affected uuid[]:='{}'; snapshot jsonb;
begin
 if auth.uid() is null or not public.curriculum_is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
 if p_kind='path' then
  select to_jsonb(t) into root from public.learning_paths t where id=p_id;
  select coalesce(array_agg(id),'{}') into mids from public.learning_modules where learning_path_id=p_id;
  select coalesce(array_agg(id),'{}') into lids from public.lessons where learning_path_id=p_id or module_id=any(mids);
  parents:=array[p_id];
 elsif p_kind='module' then
  select to_jsonb(t) into root from public.learning_modules t where id=p_id;
  mids:=array[p_id];
  select coalesce(array_agg(id),'{}') into lids from public.lessons where module_id=p_id;
  parents:=array[(root->>'learning_path_id')::uuid];
 elsif p_kind='lesson' then
  select to_jsonb(t) into root from public.lessons t where id=p_id;
  lids:=array[p_id];parents:=array[(root->>'learning_path_id')::uuid];
 else raise exception 'Invalid curriculum kind' using errcode='22023'; end if;
 if root is null then raise exception 'Content not found' using errcode='P0002'; end if;
 select coalesce(array_agg(distinct id),'{}') into modules_affected from public.learning_modules where id=any(mids) or id in(select module_id from public.lessons where id=any(lids));
 select coalesce(array_agg(id),'{}') into aids from public.lesson_activities where lesson_id=any(lids) or module_id=any(mids);
 snapshot:=jsonb_build_object('root',root,
 'modules',coalesce((select jsonb_agg(to_jsonb(t) order by id) from public.learning_modules t where id=any(mids)),'[]'),
 'lessons',coalesce((select jsonb_agg(to_jsonb(t) order by id) from public.lessons t where id=any(lids)),'[]'),
 'activities',coalesce((select jsonb_agg(to_jsonb(t) order by id) from public.lesson_activities t where id=any(aids)),'[]'),
 'attempts',coalesce((select jsonb_agg(to_jsonb(t) order by id) from public.activity_attempts t where activity_id=any(aids)),'[]'),
 'versions',coalesce((select jsonb_agg(to_jsonb(t) order by id) from public.curriculum_versions t where lesson_id=any(lids)),'[]'),
 'prerequisites',coalesce((select jsonb_agg(to_jsonb(t) order by lesson_id,prerequisite_id) from public.lesson_prerequisites t where lesson_id=any(lids) or prerequisite_id=any(lids)),'[]'),
 'lesson_progress',coalesce((select jsonb_agg(to_jsonb(t) order by user_id,lesson_id) from public.lesson_progress t where lesson_id=any(lids)),'[]'),
 'module_progress',coalesce((select jsonb_agg(to_jsonb(t) order by user_id,module_id) from public.module_progress t where module_id=any(modules_affected)),'[]'),
 'path_progress',coalesce((select jsonb_agg(to_jsonb(t) order by user_id,learning_path_id) from public.learning_path_progress t where learning_path_id=any(parents) or current_module_id=any(mids) or current_lesson_id=any(lids)),'[]'),
 'challenge_links',coalesce((select jsonb_agg(jsonb_build_object('id',id,'learning_path_id',learning_path_id,'module_id',module_id,'lesson_id',lesson_id) order by id) from public.challenges where
  (p_kind='path' and learning_path_id=p_id) or module_id=any(mids) or lesson_id=any(lids)),'[]'));
 return jsonb_build_object('kind',p_kind,'id',p_id,'slug',root->>'slug','title_en',root->>'title_en','title_ar',root->>'title_ar',
 'revision',md5(snapshot::text),'counts',jsonb_build_object('paths',case when p_kind='path' then 1 else 0 end,
 'modules',cardinality(mids),'lessons',cardinality(lids),'activities',cardinality(aids),
 'activity_attempts',jsonb_array_length(snapshot->'attempts'),'lesson_progress',jsonb_array_length(snapshot->'lesson_progress'),
 'module_progress',(select count(*) from public.module_progress where module_id=any(mids)),
 'path_progress',case when p_kind='path' then (select count(*) from public.learning_path_progress where learning_path_id=p_id) else 0 end,
 'linked_challenges',jsonb_array_length(snapshot->'challenge_links'),
 'prerequisite_links',jsonb_array_length(snapshot->'prerequisites')));
end $$;

-- SECURITY DEFINER is limited to this explicitly admin-authorized operation:
-- no new table DELETE grants are given to the shared authenticated role.
create or replace function public.curriculum_delete_subtree(p_kind text,p_id uuid,p_confirmation text,p_revision text) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='5s' as $$
declare plan jsonb; bid uuid; mids uuid[]:='{}'; lids uuid[]:='{}'; aids uuid[]:='{}'; parents uuid[]:='{}'; affected uuid[]:='{}'; cids uuid[]:='{}';
 progress record; totals record; ready boolean; modules_total integer; modules_done integer;
begin
 if auth.uid() is null or not public.curriculum_is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext('testcraft-curriculum-import'));
 -- Parent FOR UPDATE locks also block FK inserts, so new children cannot slip
 -- between the preview recheck, backup and deletion. Lock from parent to child.
 if p_kind='path' then
  perform 1 from public.learning_paths where id=p_id for update;
 elsif p_kind='module' then
  perform 1 from public.learning_modules where id=p_id for update;
 elsif p_kind='lesson' then
  perform 1 from public.lessons where id=p_id for update;
 else raise exception 'Invalid curriculum kind' using errcode='22023'; end if;
 if not found then raise exception 'Content not found' using errcode='P0002'; end if;
 if p_kind='path' then
  perform 1 from public.learning_modules where learning_path_id=p_id order by id for update;
  select coalesce(array_agg(id),'{}') into mids from public.learning_modules where learning_path_id=p_id;
 elsif p_kind='module' then mids:=array[p_id]; end if;
 perform 1 from public.lessons where (p_kind='path' and learning_path_id=p_id) or module_id=any(mids) or (p_kind='lesson' and id=p_id) order by id for update;
 select coalesce(array_agg(id),'{}'),coalesce(array_agg(distinct learning_path_id),'{}') into lids,parents from public.lessons
  where (p_kind='path' and learning_path_id=p_id) or module_id=any(mids) or (p_kind='lesson' and id=p_id);
 if p_kind='path' then parents:=array[p_id];
 elsif p_kind='module' then select array[learning_path_id] into parents from public.learning_modules where id=p_id; end if;
 select coalesce(array_agg(id),'{}') into affected from public.learning_modules where id=any(mids) or id in(select module_id from public.lessons where id=any(lids));
 perform 1 from public.lesson_activities where lesson_id=any(lids) or module_id=any(mids) order by id for update;
 select coalesce(array_agg(id),'{}') into aids from public.lesson_activities where lesson_id=any(lids) or module_id=any(mids);
 -- Existing child rows can be edited without changing their FK values. Lock
 -- them too, so the backup includes their final state at deletion time.
 perform 1 from public.activity_attempts where activity_id=any(aids) order by id for update;
 perform 1 from public.curriculum_versions where lesson_id=any(lids) order by id for update;
 perform 1 from public.lesson_prerequisites where lesson_id=any(lids) or prerequisite_id=any(lids) order by lesson_id,prerequisite_id for update;
 perform 1 from public.lesson_progress where lesson_id=any(lids) order by user_id,lesson_id for update;
 perform 1 from public.module_progress where module_id=any(affected) order by user_id,module_id for update;
 perform 1 from public.challenges where (p_kind='path' and learning_path_id=p_id) or module_id=any(mids) or lesson_id=any(lids) order by id for update;
 select coalesce(array_agg(id),'{}') into cids from public.challenges where (p_kind='path' and learning_path_id=p_id) or module_id=any(mids) or lesson_id=any(lids);
 perform 1 from public.learning_path_progress where learning_path_id=any(parents) or current_module_id=any(mids) or current_lesson_id=any(lids) or (p_kind<>'lesson' and current_challenge_id=any(cids)) order by user_id,learning_path_id for update;
 plan:=public.curriculum_deletion_preview(p_kind,p_id);
 if p_confirmation is distinct from plan->>'slug' then raise exception 'Type the exact content slug to confirm deletion' using errcode='22023'; end if;
 if p_revision is distinct from plan->>'revision' then raise exception 'Content or related progress changed. Review the deletion preview again.' using errcode='40001'; end if;
 -- Backup failure aborts the same transaction before a single DELETE occurs.
 bid:=public.curriculum_backup();
 update public.curriculum_backups set payload=payload||jsonb_build_object('deletion',plan||jsonb_build_object('deleted_by',auth.uid()),
  'lesson_progress',coalesce((select jsonb_agg(to_jsonb(t) order by user_id,lesson_id) from public.lesson_progress t where lesson_id=any(lids)),'[]'),
  'module_progress',coalesce((select jsonb_agg(to_jsonb(t) order by user_id,module_id) from public.module_progress t where module_id=any(affected)),'[]'),
  'learning_path_progress',coalesce((select jsonb_agg(to_jsonb(t) order by user_id,learning_path_id) from public.learning_path_progress t where learning_path_id=any(parents) or current_module_id=any(mids) or current_lesson_id=any(lids) or (p_kind<>'lesson' and current_challenge_id=any(cids))),'[]'),
  'activity_attempts',coalesce((select jsonb_agg(to_jsonb(t) order by id) from public.activity_attempts t where activity_id=any(aids)),'[]')) where id=bid;
 if not found then raise exception 'Deletion backup was not saved'; end if;
 if exists(select 1 from public.lessons l where l.id=any(lids) and not exists(
  select 1 from public.curriculum_backups b,jsonb_array_elements(b.payload->'lessons') saved where b.id=bid and saved->>'id'=l.id::text)) then raise exception 'Deletion backup verification failed'; end if;
 update public.challenges set
  learning_path_id=case when p_kind='path' and learning_path_id=p_id then null else learning_path_id end,
  module_id=case when module_id=any(mids) then null else module_id end,
  lesson_id=case when lesson_id=any(lids) then null else lesson_id end
 where id=any(cids);
 delete from public.activity_attempts where activity_id=any(aids);
 delete from public.lesson_activities where id=any(aids);
 delete from public.curriculum_versions where lesson_id=any(lids);
 delete from public.lesson_prerequisites where lesson_id=any(lids) or prerequisite_id=any(lids);
 delete from public.lesson_progress where lesson_id=any(lids);
 delete from public.module_progress where module_id=any(mids);
 if p_kind='path' then delete from public.learning_path_progress where learning_path_id=p_id; end if;
 -- Explicit pointer cleanup also works on older FK layouts without SET NULL.
 update public.learning_path_progress set
  current_module_id=case when current_module_id=any(mids) then null else current_module_id end,
  current_lesson_id=case when current_lesson_id=any(lids) then null else current_lesson_id end,
  current_challenge_id=case when p_kind<>'lesson' and current_challenge_id=any(cids) then null else current_challenge_id end
 where current_module_id=any(mids) or current_lesson_id=any(lids) or (p_kind<>'lesson' and current_challenge_id=any(cids));
 delete from public.lessons where id=any(lids);
 delete from public.learning_modules where id=any(mids);
 if p_kind='path' then delete from public.learning_paths where id=p_id; end if;
 -- Keep surviving parent counters accurate; retain their lesson history and XP.
 for progress in select user_id,module_id from public.module_progress where module_id=any(affected) loop
  select count(*) total,count(*) filter(where l.is_published) published,count(*) filter(where lp.completed_at is not null) completed into totals
   from public.lessons l left join public.lesson_progress lp on lp.lesson_id=l.id and lp.user_id=progress.user_id where l.module_id=progress.module_id and l.archived_at is null;
  ready:=totals.total>0 and totals.published=totals.total and totals.completed=totals.total and not exists(
   select 1 from public.challenges c where c.module_id=progress.module_id and c.is_active and c.is_required and not exists(
    select 1 from public.challenge_attempts ca where ca.challenge_id=c.id and ca.user_id=progress.user_id and ca.is_passed));
  update public.module_progress set total_lessons=totals.total,completed_lessons=totals.completed,
   completion_percentage=case when totals.total=0 then 0 else round(100.0*totals.completed/totals.total)::integer end,
   status=(case when ready then 'completed' else 'in_progress' end)::public.module_status,
   completed_at=case when ready then coalesce(completed_at,now()) else null end where user_id=progress.user_id and module_id=progress.module_id;
 end loop;
 for progress in select user_id,learning_path_id from public.learning_path_progress where learning_path_id=any(parents) loop
  select count(*),count(*) filter(where mp.status::text='completed') into modules_total,modules_done from public.learning_modules m
   left join public.module_progress mp on mp.module_id=m.id and mp.user_id=progress.user_id where m.learning_path_id=progress.learning_path_id and m.is_published and m.archived_at is null;
  update public.learning_path_progress set completed_modules=modules_done,
   completion_percentage=case when modules_total=0 then 0 else round(100.0*modules_done/modules_total)::integer end,
   completed_lessons=(select count(*) from public.lesson_progress lp join public.lessons l on l.id=lp.lesson_id join public.learning_modules m on m.id=l.module_id where lp.user_id=progress.user_id and lp.completed_at is not null and l.archived_at is null and m.learning_path_id=progress.learning_path_id and m.is_published and m.archived_at is null),
   completed_challenges=(select count(distinct ca.challenge_id) from public.challenge_attempts ca join public.challenges c on c.id=ca.challenge_id join public.learning_modules m on m.id=c.module_id where ca.user_id=progress.user_id and ca.is_passed and c.is_active and m.learning_path_id=progress.learning_path_id and m.is_published and m.archived_at is null)
   where user_id=progress.user_id and learning_path_id=progress.learning_path_id;
 end loop;
 return jsonb_build_object('backup_id',bid,'deleted',plan->'counts');
end $$;

revoke all on function public.curriculum_deletion_preview(text,uuid),public.curriculum_delete_subtree(text,uuid,text,text) from public,anon;
grant execute on function public.curriculum_deletion_preview(text,uuid),public.curriculum_delete_subtree(text,uuid,text,text) to authenticated;
commit;
notify pgrst,'reload schema';

begin;
create table public.lesson_prerequisites(
 lesson_id uuid not null references public.lessons(id),prerequisite_id uuid not null references public.lessons(id),
 primary key(lesson_id,prerequisite_id),check(lesson_id<>prerequisite_id)
);
alter table public.lesson_prerequisites enable row level security;
create policy prerequisite_admin on public.lesson_prerequisites for all to authenticated using(public.curriculum_is_admin()) with check(public.curriculum_is_admin());
grant select,insert,update on public.lesson_prerequisites to authenticated;
create or replace function public.curriculum_can_read_lesson(p_lesson uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.lessons l where l.id=p_lesson and l.is_published and public.curriculum_can_read_module(l.module_id)
  and not exists(select 1 from public.lesson_prerequisites r join public.lessons required on required.id=r.prerequisite_id where r.lesson_id=l.id
   and (not required.is_published or not exists(select 1 from public.lesson_progress p where p.user_id=auth.uid() and p.lesson_id=r.prerequisite_id and p.completed_at is not null))))
$$;
revoke all on function public.curriculum_can_read_lesson(uuid) from public,anon;
grant execute on function public.curriculum_can_read_lesson(uuid) to authenticated;
-- Learner RLS hides drafts, so client-visible lesson counts cannot prove that
-- the whole module is complete. Return only authoritative aggregate counters.
create or replace function public.curriculum_module_completion(p_module uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare total integer; published integer; completed integer;
begin
 if not public.curriculum_can_read_module(p_module) then raise exception 'Module unavailable'; end if;
 select count(*),count(*) filter(where l.is_published),
  count(*) filter(where l.is_published and lp.completed_at is not null)
 into total,published,completed from public.lessons l left join public.lesson_progress lp
  on lp.lesson_id=l.id and lp.user_id=auth.uid() where l.module_id=p_module;
 return jsonb_build_object('total',total,'published',published,'completed',completed,
  'ready',total>0 and published=total and completed=total);
end $$;
revoke all on function public.curriculum_module_completion(uuid) from public,anon;
grant execute on function public.curriculum_module_completion(uuid) to authenticated;
create or replace function public.curriculum_import(p_manifest jsonb,p_fingerprint text,p_lessons jsonb default '[]',p_assessments jsonb default '[]')
returns jsonb language plpgsql security invoker set search_path=public as $$
declare p jsonb; m jsonb; l jsonb; d jsonb; a jsonb; checkpoint jsonb; pid uuid; mid uuid; lid uuid;
 bid uuid; fresh boolean; inserted_paths integer:=0; inserted_modules integer:=0; inserted_lessons integer:=0;
 staged integer:=0; sid uuid; r record; key text; new_ids uuid[]:='{}'; prerequisite text; required_id uuid;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 perform pg_advisory_xact_lock(hashtext('testcraft-curriculum-import'));
 bid:=public.curriculum_backup();
 insert into public.curriculum_sources(fingerprint,manifest,created_by) values(p_fingerprint,p_manifest,auth.uid())
 on conflict(fingerprint) do nothing;
 select id into sid from public.curriculum_sources where fingerprint=p_fingerprint;
 for p in select value from jsonb_array_elements(p_manifest->'paths') loop
  pid:=null;
  select id into pid from public.learning_paths where slug=p->>'path_slug';
  if pid is null then
   insert into public.learning_paths(slug,title,description,title_en,title_ar,description_en,description_ar,sort_order,is_active)
   values(p->>'path_slug',p->>'title_en',p->>'description_en',p->>'title_en',p->>'title_ar',p->>'description_en',p->>'description_ar',(p->>'sort_order')::integer,false) returning id into pid;
   inserted_paths:=inserted_paths+1;
  end if;
  for m in select value from jsonb_array_elements(p->'modules') loop
   mid:=null;
   select id into mid from public.learning_modules where learning_path_id=pid and slug=m->>'module_slug';
   if mid is null then
    insert into public.learning_modules(learning_path_id,slug,title_en,title_ar,description_en,description_ar,sort_order,is_published)
    values(pid,m->>'module_slug',m->>'title_en',m->>'title_ar',m->>'description_en',m->>'description_ar',(m->>'sort_order')::integer,false) returning id into mid;
    inserted_modules:=inserted_modules+1;
   end if;
   for l in select value from jsonb_array_elements(m->'lessons') loop
    key:=(p->>'path_slug')||'/'||(m->>'module_slug')||'/'||(l->>'lesson_slug');
    d:=null; lid:=null; fresh:=false;
    select value into d from jsonb_array_elements(p_lessons) where value->>'key'=key;
    select id into lid from public.lessons where learning_path_id=pid and slug=l->>'lesson_slug';
    if lid is not null and not exists(select 1 from public.lessons where id=lid and module_id=mid) then
     raise exception 'Existing lesson belongs to another module: %',key;
    end if;
    if lid is null then
     insert into public.lessons(learning_path_id,module_id,slug,title,content,title_en,title_ar,sort_order,is_published,objectives_en,objectives_ar,difficulty)
     values(pid,mid,l->>'lesson_slug',l->>'title_en','Draft awaiting educational content generation.',l->>'title_en',l->>'title_ar',
       (l->>'sort_order')::integer,false,
       array(select jsonb_array_elements_text(l->'objectives_en')),array(select jsonb_array_elements_text(l->'objectives_ar')),
       (l->>'difficulty')::public.difficulty_level) returning id into lid;
     fresh:=true; new_ids:=array_append(new_ids,lid); inserted_lessons:=inserted_lessons+1;
    end if;
    if d is not null then
     insert into public.curriculum_versions(lesson_id,fingerprint,body,base_updated_at,created_by)
      select lid,md5(d::text),d,updated_at,auth.uid() from public.lessons where id=lid on conflict do nothing;
     staged:=staged+1;
     -- New rows can receive complete drafts; existing manual or published bodies remain untouched.
     if fresh then
      update public.lessons set content=d->>'content_en',content_en=d->>'content_en',content_ar=d->>'content_ar',
       summary_en=d->>'summary_en',summary_ar=d->>'summary_ar',estimated_minutes=(d->>'estimated_minutes')::integer,
       objectives_en=array(select jsonb_array_elements_text(d->'objectives_en')),
       objectives_ar=array(select jsonb_array_elements_text(d->'objectives_ar')) where id=lid;
      update public.curriculum_versions set status='applied' where lesson_id=lid and fingerprint=md5(d::text);
      for a in select value from jsonb_array_elements(d->'activities') loop
       insert into public.lesson_activities(lesson_id,module_id,slug,body) values(lid,mid,a->>'slug',a);
      end loop;
     end if;
    end if;
   end loop;
   -- Checkpoint additions are immutable versions and unpublished until explicit admin publication.
   select value into checkpoint from jsonb_array_elements(p_assessments) where value->>'module_key'=(p->>'path_slug')||'/'||(m->>'module_slug');
   if checkpoint is not null then
    for a in select value from jsonb_array_elements(checkpoint->'activities') loop
     if not exists(select 1 from public.lesson_activities where module_id=mid and lesson_id is null and slug=a->>'slug' and body=a) then
      insert into public.lesson_activities(module_id,slug,version,body)
       select mid,a->>'slug',coalesce(max(version),0)+1,a from public.lesson_activities where module_id=mid and lesson_id is null and slug=a->>'slug';
     end if;
    end loop;
   end if;
   -- Link only an existing verified challenge with consistent path/module; never invent a lab.
   if nullif(m->>'practical_challenge_slug','') is not null then
    if not exists(select 1 from public.challenges where slug=m->>'practical_challenge_slug' and module_id=mid and learning_path_id=pid) then
     raise exception 'Challenge association must already exist and match module/path: %',m->>'practical_challenge_slug';
    end if;
   end if;
  end loop;
 end loop;
 -- Resolve prerequisites only after every verified lesson has an ID.
 -- Existing lesson metadata remains untouched; no silent reconfiguration of manual/published records.
 for p in select value from jsonb_array_elements(p_manifest->'paths') loop
  for m in select value from jsonb_array_elements(p->'modules') loop
   for l in select value from jsonb_array_elements(m->'lessons') loop
    select ls.id into lid from public.lessons ls join public.learning_paths lp on lp.id=ls.learning_path_id
     where lp.slug=p->>'path_slug' and ls.slug=l->>'lesson_slug';
    if lid=any(new_ids) then
     for prerequisite in select jsonb_array_elements_text(l->'prerequisites') loop
      select ls.id into required_id from public.lessons ls join public.learning_paths lp on lp.id=ls.learning_path_id
       join public.learning_modules lm on lm.id=ls.module_id
       where lp.slug=split_part(prerequisite,'/',1) and lm.slug=split_part(prerequisite,'/',2) and ls.slug=split_part(prerequisite,'/',3);
      if required_id is null then raise exception 'Unresolved prerequisite: %',prerequisite; end if;
      insert into public.lesson_prerequisites values(lid,required_id) on conflict do nothing;
     end loop;
    end if;
   end loop;
  end loop;
 end loop;
 return jsonb_build_object('source_id',sid,'backup_id',bid,'inserted_paths',inserted_paths,'inserted_modules',inserted_modules,'inserted_lessons',inserted_lessons,'draft_versions',staged,'published',0);
end $$;
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
 'prerequisites',coalesce((select jsonb_agg(to_jsonb(t)) from public.lesson_prerequisites t),'[]'),
 'hidden_bugs',coalesce((select jsonb_agg(to_jsonb(t)) from public.hidden_bugs t),'[]')))
 returning id into bid; return bid;
end $$;
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
 insert into public.lesson_prerequisites select * from jsonb_populate_recordset(null::public.lesson_prerequisites,coalesce(p_payload->'prerequisites','[]'::jsonb));
 -- Restoration approval does not publish teaching content.
 update public.learning_paths set is_active=false;
 update public.learning_modules set is_published=false;
 update public.lessons set is_published=false;
 update public.challenges set is_active=false,status='draft';
 update public.lesson_activities set is_published=false;
 return jsonb_build_object('paths',(select count(*) from public.learning_paths),'lessons',(select count(*) from public.lessons),
 'activities',(select count(*) from public.lesson_activities),'published',0);
end $$;
create or replace function public.curriculum_get_activities(p_lesson uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare l public.lessons;
begin
 select * into l from public.lessons where id=p_lesson and is_published;
 if not found or not public.curriculum_can_read_lesson(l.id) then raise exception 'Lesson unavailable'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'version',a.version,'kind',a.body->'kind','prompt',a.body->'prompt','options',a.body->'options','sort_order',a.body->'sort_order','module_assessment',a.lesson_id is null) order by a.lesson_id nulls last,(a.body->>'sort_order')::integer)
 from public.lesson_activities a where a.is_published and not a.retired and
 (a.lesson_id=l.id or (a.module_id=l.module_id and a.lesson_id is null and not exists(select 1 from public.lessons pending where pending.module_id=l.module_id and not pending.is_published) and not exists(
  select 1 from public.lessons after_l where after_l.module_id=l.module_id and after_l.sort_order>l.sort_order)))),'[]'::jsonb);
end $$;
create or replace function public.curriculum_submit_activity(p_activity uuid,p_request uuid,p_selected jsonb,p_text text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.lesson_activities; prior public.activity_attempts; attempt_id uuid; st text; result_score integer; feedback jsonb; cnt integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 -- Same request ID is idempotent across network retries.
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text||p_request::text));
 select * into prior from public.activity_attempts where user_id=auth.uid() and request_id=p_request;
 if found then
  if prior.activity_id<>p_activity then raise exception 'Request ID already used'; end if;
  return jsonb_build_object('id',prior.id,'status',prior.status,'score',prior.score,'feedback',prior.feedback);
 end if;
 select * into a from public.lesson_activities where id=p_activity and is_published and not retired;
 if not found or not public.curriculum_can_read_module(a.module_id) then raise exception 'Activity unavailable'; end if;
 if a.lesson_id is not null and not public.curriculum_can_read_lesson(a.lesson_id) then raise exception 'Lesson unavailable'; end if;
 if a.lesson_id is null and exists(select 1 from public.lessons l where l.module_id=a.module_id and (not l.is_published
  or not exists(select 1 from public.lesson_progress lp where lp.lesson_id=l.id and lp.user_id=auth.uid() and lp.completed_at is not null))) then raise exception 'Complete module lessons first'; end if;
 if jsonb_typeof(p_selected) is distinct from 'array' or p_text is null or length(p_text)>5000 then raise exception 'Invalid response'; end if;
 cnt:=jsonb_array_length(p_selected);
 if a.body->>'kind'='short_answer' then
  if cnt<>0 or length(trim(p_text))<20 then raise exception 'Write at least 20 characters'; end if;
  st:='needs_review'; result_score:=null; feedback:=jsonb_build_object('rubric',a.body->'rubric');
 else
  if p_text<>'' or cnt=0 or cnt>(jsonb_array_length(a.body->'options')) or
    (a.body->>'kind'<>'multi_select' and cnt<>1) or
    (select count(distinct value) from jsonb_array_elements_text(p_selected))<>cnt or
    exists(select 1 from jsonb_array_elements_text(p_selected) s where not exists(select 1 from jsonb_array_elements(a.body->'options') o where o->>'id'=s.value))
   then raise exception 'Invalid selected options'; end if;
  st:='graded';
  result_score:=case when p_selected @> (a.body->'answer') and (a.body->'answer') @> p_selected then 1 else 0 end;
  feedback:=jsonb_build_object('explanation',a.body->'explanation');
 end if;
 insert into public.activity_attempts(activity_id,user_id,request_id,response,status,score,feedback)
 values(a.id,auth.uid(),p_request,jsonb_build_object('selected',p_selected,'text',p_text),st,result_score,feedback) returning id into attempt_id;
 -- Formative checks award no XP. Existing lesson/challenge XP remains authoritative.
 return jsonb_build_object('id',attempt_id,'status',st,'score',result_score,'feedback',feedback);
end $$;
create or replace function public.curriculum_award_lesson(p_lesson uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); l public.lessons; previous integer; total integer; lvl integer; n integer; award integer:=0; badges jsonb;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select * into l from public.lessons where id=p_lesson and is_published;
 if not found or not public.curriculum_can_read_lesson(l.id) or
 not exists(select 1 from public.lesson_progress where user_id=uid and lesson_id=l.id and completed_at is not null) then raise exception 'Complete an accessible published lesson first'; end if;
 select coalesce(current_level,1) into previous from public.profiles where id=uid for update;
 insert into public.xp_transactions(user_id,source_type,source_id,amount,reason,metadata)
 values(uid,'lesson',l.id,10,'lesson_completed','{}') on conflict do nothing;
 get diagnostics n=row_count;
 if n=1 then
  award:=10;
  update public.profiles set total_xp=coalesce(total_xp,0)+award where id=uid;
 end if;
 select coalesce(total_xp,0) into total from public.profiles where id=uid;
 lvl:=greatest(1,floor((1+sqrt(1+4*total::numeric/75))/2)::integer);
 update public.profiles set current_level=lvl where id=uid;
 badges:=public.curriculum_badges(uid);
 return jsonb_build_object('awarded',award>0,'totalXpAwarded',award,'newTotalXp',total,'newLevel',lvl,'previousLevel',previous,'leveledUp',lvl>previous,'newBadges',badges);
end $$;
commit;
notify pgrst,'reload schema';

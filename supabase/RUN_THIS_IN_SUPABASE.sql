-- ==========================================================================
-- TestCraft Curriculum Factory Migrations (020 - 033 Consolidated)
-- Apply this file directly in Supabase Dashboard -> SQL Editor
-- ==========================================================================

-- >>> MIGRATION: 020_practical_challenge_security.sql <<<
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

-- >>> MIGRATION: 021_curriculum_factory.sql <<<
begin;
create or replace function public.curriculum_is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;

create table public.curriculum_backups (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 created_by uuid references public.profiles(id), payload jsonb not null
);
create table public.curriculum_sources (
 id uuid primary key default gen_random_uuid(), fingerprint text not null unique,
 manifest jsonb not null, created_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table public.curriculum_versions (
 id uuid primary key default gen_random_uuid(), lesson_id uuid not null references public.lessons(id),
 fingerprint text not null, body jsonb not null, base_updated_at timestamptz not null,
 status text not null default 'needs_review' check(status in ('needs_review','approved','applied','rejected')),
 created_by uuid references public.profiles(id), created_at timestamptz not null default now(),
 unique(lesson_id,fingerprint)
);
create table public.lesson_activities (
 id uuid primary key default gen_random_uuid(), lesson_id uuid references public.lessons(id),
 module_id uuid not null references public.learning_modules(id),
 slug text not null, version integer not null default 1, body jsonb not null,
 is_published boolean not null default false, retired boolean not null default false,
 created_at timestamptz not null default now(),
 unique(module_id,lesson_id,slug,version)
);
create unique index module_assessment_version on public.lesson_activities(module_id,slug,version) where lesson_id is null;
create table public.activity_attempts (
 id uuid primary key default gen_random_uuid(), activity_id uuid not null references public.lesson_activities(id),
 user_id uuid not null references public.profiles(id), request_id uuid not null,
 response jsonb not null, status text not null check(status in ('graded','needs_review','reviewed')),
 score integer check(score in (0,1)), feedback jsonb not null, review_feedback text,
 reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz not null default now(),
 unique(user_id,request_id)
);
create index activity_attempts_user_activity on public.activity_attempts(user_id,activity_id,created_at desc);
create table public.curriculum_jobs (
 id uuid primary key default gen_random_uuid(), source_id uuid not null references public.curriculum_sources(id),
 created_by uuid not null references public.profiles(id), manifest jsonb not null,
 status text not null default 'queued' check(status in ('queued','running','paused','completed','needs_review','failed','budget_exhausted')),
 max_requests integer not null check(max_requests between 1 and 10000),
 max_cost_usd numeric(12,6) not null check(max_cost_usd>0),
 requests integer not null default 0, reserved_cost_usd numeric(12,6) not null default 0,
 actual_cost_usd numeric(12,6) not null default 0, provider_config jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.curriculum_job_items (
 id uuid primary key default gen_random_uuid(), job_id uuid not null references public.curriculum_jobs(id),
 lesson_key text not null, spec jsonb not null,
 status text not null default 'queued' check(status in ('queued','running','completed','failed','skipped','needs_review')),
 attempts integer not null default 0, error text, output jsonb,
 next_attempt_at timestamptz not null default now(), claimed_at timestamptz, claim_token uuid,
 unique(job_id,lesson_key)
);
-- All private content/answer keys/jobs/exports are admin-only by default.
do $$
declare t text;
begin
 foreach t in array array['curriculum_backups','curriculum_sources','curriculum_versions','lesson_activities','curriculum_jobs','curriculum_job_items']
 loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy admin_only on public.%I for all to authenticated using (public.curriculum_is_admin()) with check (public.curriculum_is_admin())',t);
 end loop;
end $$;
alter table public.activity_attempts enable row level security;
create policy attempts_read_own on public.activity_attempts for select to authenticated using(user_id=auth.uid() or public.curriculum_is_admin());
create policy attempts_review_admin on public.activity_attempts for update to authenticated using(public.curriculum_is_admin()) with check(public.curriculum_is_admin());

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
 'challenge_links',coalesce((select jsonb_agg(jsonb_build_object('id',id,'slug',slug,'module_id',module_id,'lesson_id',lesson_id,'learning_path_id',learning_path_id)) from public.challenges),'[]')))
 returning id into bid;
 return bid;
end $$;

-- Import is atomic, serialized and insert-only for existing hierarchy/content.
create or replace function public.curriculum_import(p_manifest jsonb,p_fingerprint text,p_lessons jsonb default '[]',p_assessments jsonb default '[]')
returns jsonb language plpgsql security invoker set search_path=public as $$
declare p jsonb; m jsonb; l jsonb; d jsonb; a jsonb; checkpoint jsonb; pid uuid; mid uuid; lid uuid;
 bid uuid; fresh boolean; inserted_paths integer:=0; inserted_modules integer:=0; inserted_lessons integer:=0;
 staged integer:=0; sid uuid; r record; key text;
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
     fresh:=true; inserted_lessons:=inserted_lessons+1;
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
 return jsonb_build_object('source_id',sid,'backup_id',bid,'inserted_paths',inserted_paths,'inserted_modules',inserted_modules,'inserted_lessons',inserted_lessons,'draft_versions',staged,'published',0);
end $$;



-- Guard new/moved relationships; legacy inconsistent rows are not rewritten.
create or replace function public.curriculum_check_lesson_path() returns trigger language plpgsql set search_path=public as $$
begin
 if new.module_id is not null and not exists(select 1 from public.learning_modules where id=new.module_id and learning_path_id=new.learning_path_id) then
  raise exception 'lesson module/path mismatch';
 end if;
 return new;
end $$;
create trigger curriculum_lesson_path before insert or update of module_id,learning_path_id on public.lessons
 for each row execute function public.curriculum_check_lesson_path();

create or replace function public.curriculum_apply_version(p_version uuid,p_expected_updated timestamptz) returns uuid
language plpgsql security invoker set search_path=public as $$
declare v public.curriculum_versions; l public.lessons; a jsonb; n integer;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 select * into v from public.curriculum_versions where id=p_version for update;
 if not found or v.status not in ('needs_review','approved') then raise exception 'Revision unavailable'; end if;
 select * into l from public.lessons where id=v.lesson_id for update;
 if l.is_published then raise exception 'Unpublish explicitly before applying a revision'; end if;
 if l.updated_at<>p_expected_updated or v.base_updated_at<>p_expected_updated then raise exception 'Lesson changed; regenerate or review a fresh revision'; end if;
 perform public.curriculum_backup();
 update public.lessons set content=v.body->>'content_en',content_en=v.body->>'content_en',content_ar=v.body->>'content_ar',
 summary_en=v.body->>'summary_en',summary_ar=v.body->>'summary_ar',title_en=v.body->>'title_en',title_ar=v.body->>'title_ar',
 objectives_en=array(select jsonb_array_elements_text(v.body->'objectives_en')),
 objectives_ar=array(select jsonb_array_elements_text(v.body->'objectives_ar')),
 estimated_minutes=(v.body->>'estimated_minutes')::integer,updated_at=now() where id=l.id;
 update public.lesson_activities set retired=true,is_published=false where lesson_id=l.id;
 for a in select value from jsonb_array_elements(v.body->'activities') loop
  select coalesce(max(version),0)+1 into n from public.lesson_activities where lesson_id=l.id and slug=a->>'slug';
  insert into public.lesson_activities(lesson_id,module_id,slug,version,body) values(l.id,l.module_id,a->>'slug',n,a);
 end loop;
 update public.curriculum_versions set status='applied' where id=v.id;
 return l.id;
end $$;

create or replace function public.curriculum_publish(p_lesson uuid,p_acknowledged boolean) returns void
language plpgsql security invoker set search_path=public as $$
declare l public.lessons; n integer;
begin
 if not public.curriculum_is_admin() or p_acknowledged is distinct from true then raise exception 'Explicit administrator approval required'; end if;
 select * into l from public.lessons where id=p_lesson for update;
 if not found or l.module_id is null or length(coalesce(l.content_en,''))<2200 or length(coalesce(l.content_ar,''))<1800 then raise exception 'Complete bilingual lesson required'; end if;
 select count(*) into n from public.lesson_activities where lesson_id=l.id and not retired;
 if n not between 1 and 3 then raise exception '1-3 reviewed activities required'; end if;
 perform public.curriculum_backup();
 update public.learning_paths set is_active=true where id=l.learning_path_id;
 update public.learning_modules set is_published=true where id=l.module_id;
 update public.lessons set is_published=true where id=l.id;
 update public.lesson_activities set is_published=true where lesson_id=l.id and not retired;
 -- Publish only the latest module checkpoint revision, without changing old attempts.
 update public.lesson_activities a set is_published=(a.version=(select max(b.version) from public.lesson_activities b where b.module_id=a.module_id and b.lesson_id is null and b.slug=a.slug))
 where a.module_id=l.module_id and a.lesson_id is null;
end $$;

-- Access checks run inside SECURITY DEFINER RPCs as well as in application routes.
create or replace function public.curriculum_can_read_module(p_module uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select auth.uid() is not null and exists(
 select 1 from public.learning_modules m join public.learning_paths p on p.id=m.learning_path_id
 where m.id=p_module and m.is_published and p.is_active
 and not exists(
  select 1 from public.learning_modules prior where prior.learning_path_id=m.learning_path_id and prior.is_published and prior.sort_order<m.sort_order
  and (exists(select 1 from public.lessons l where l.module_id=prior.id and (not l.is_published or not exists(
   select 1 from public.lesson_progress lp where lp.lesson_id=l.id and lp.user_id=auth.uid() and lp.completed_at is not null)))
  or exists(select 1 from public.challenges c where c.module_id=prior.id and c.is_active and c.is_required and not exists(
   select 1 from public.challenge_attempts ca where ca.challenge_id=c.id and ca.user_id=auth.uid() and ca.is_passed=true)))
 )) $$;

create or replace function public.curriculum_get_activities(p_lesson uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare l public.lessons;
begin
 select * into l from public.lessons where id=p_lesson and is_published;
 if not found or not public.curriculum_can_read_module(l.module_id) then raise exception 'Lesson unavailable'; end if;
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
 if a.lesson_id is not null and not exists(select 1 from public.lessons where id=a.lesson_id and is_published) then raise exception 'Lesson unavailable'; end if;
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

-- One claim per HTTP/worker tick. Worst-case request cost is reserved BEFORE contacting the provider.
create or replace function public.curriculum_claim(p_job uuid) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare j public.curriculum_jobs; item public.curriculum_job_items; cost numeric; token uuid:=gen_random_uuid();
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 select * into j from public.curriculum_jobs where id=p_job for update;
 if not found or j.status not in ('queued','running') then return null; end if;
 -- Ambiguous/abandoned requests remain charged; no automatic budget refunds.
 update public.curriculum_job_items set status='failed',error='Worker lease expired; reservation retained',next_attempt_at=now()
 where job_id=j.id and status='running' and claimed_at<now()-interval '5 minutes';
 if exists(select 1 from public.curriculum_job_items where job_id=j.id and status='running') then return null; end if;
 select * into item from public.curriculum_job_items where job_id=j.id and
 (status='queued' or (status='failed' and attempts<3 and next_attempt_at<=now()))
 order by spec->>'key' for update skip locked limit 1;
 if not found then
  if not exists(select 1 from public.curriculum_job_items where job_id=j.id and (status='queued' or (status='failed' and attempts<3))) then
   update public.curriculum_jobs set status=case when exists(select 1 from public.curriculum_job_items where job_id=j.id and status='failed') then 'failed' else 'needs_review' end,updated_at=now() where id=j.id;
  end if;
  return null;
 end if;
 cost:=(j.provider_config->>'request_ceiling_usd')::numeric;
 if cost is null or cost<=0 then raise exception 'Invalid price ceiling'; end if;
 if j.requests>=j.max_requests or j.reserved_cost_usd+cost>j.max_cost_usd then
  update public.curriculum_jobs set status='budget_exhausted',updated_at=now() where id=j.id; return null;
 end if;
 update public.curriculum_jobs set requests=requests+1,reserved_cost_usd=reserved_cost_usd+cost,status='running',updated_at=now() where id=j.id;
 update public.curriculum_job_items set status='running',attempts=attempts+1,claimed_at=now(),claim_token=token,error=null where id=item.id;
 return jsonb_build_object('item_id',item.id,'claim_token',token,'spec',item.spec,'provider_config',j.provider_config,'attempt',item.attempts+1);
end $$;

-- Explicit grants: SECURITY DEFINER functions are never callable anonymously.
revoke all on function public.curriculum_backup() from public,anon;
revoke all on function public.curriculum_get_activities(uuid) from public,anon;
revoke all on function public.curriculum_submit_activity(uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.curriculum_backup(),public.curriculum_get_activities(uuid),public.curriculum_submit_activity(uuid,uuid,jsonb,text) to authenticated;
revoke all on function public.curriculum_import(jsonb,text,jsonb,jsonb),public.curriculum_apply_version(uuid,timestamptz),public.curriculum_publish(uuid,boolean),public.curriculum_claim(uuid) from public,anon;
grant execute on function public.curriculum_import(jsonb,text,jsonb,jsonb),public.curriculum_apply_version(uuid,timestamptz),public.curriculum_publish(uuid,boolean),public.curriculum_claim(uuid) to authenticated;
commit;
notify pgrst,'reload schema';

-- >>> MIGRATION: 022_curriculum_jobs.sql <<<
begin;
grant select,insert,update on public.curriculum_backups,public.curriculum_sources,public.curriculum_versions,
 public.lesson_activities,public.curriculum_jobs,public.curriculum_job_items to authenticated;
grant select,update on public.activity_attempts to authenticated;

create or replace function public.curriculum_start_job(p_source uuid,p_manifest jsonb,p_specs jsonb,p_requests integer,p_cost numeric,p_config jsonb,p_regenerate boolean default false)
returns uuid language plpgsql security invoker set search_path=public as $$
declare jid uuid; spec jsonb; lid uuid; run_key text; skip_item boolean;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 if jsonb_array_length(p_specs)=0 then raise exception 'No selected lessons'; end if;
 run_key:=md5(p_source::text||p_specs::text||p_requests::text||p_cost::text||p_config::text||p_regenerate::text);
 perform pg_advisory_xact_lock(hashtext(run_key));
 select id into jid from public.curriculum_jobs where status in ('queued','running','paused') and provider_config->>'run_key'=run_key limit 1;
 if jid is not null then return jid; end if;
 insert into public.curriculum_jobs(source_id,created_by,manifest,max_requests,max_cost_usd,provider_config)
 values(p_source,auth.uid(),p_manifest,p_requests,p_cost,p_config||jsonb_build_object('run_key',run_key)) returning id into jid;
 for spec in select value from jsonb_array_elements(p_specs) loop
  select l.id into lid from public.lessons l join public.learning_paths p on p.id=l.learning_path_id
  join public.learning_modules m on m.id=l.module_id
  where p.slug=spec->>'path_slug' and m.slug=spec->>'module_slug' and l.slug=spec->>'lesson_slug';
  if lid is null then raise exception 'Import manifest before starting generation'; end if;
  skip_item:=not p_regenerate and (exists(select 1 from public.curriculum_versions where lesson_id=lid and status in ('applied','approved','needs_review'))
   or exists(select 1 from public.lessons where id=lid and (is_published or length(coalesce(content_en,''))>=2200)));
  insert into public.curriculum_job_items(job_id,lesson_key,spec,status)
  values(jid,spec->>'key',spec,case when skip_item then 'skipped' else 'queued' end);
 end loop;
 return jid;
end $$;

create or replace function public.curriculum_finish(p_item uuid,p_token uuid,p_output jsonb,p_error text,p_retry boolean,p_actual_cost numeric)
returns void language plpgsql security invoker set search_path=public as $$
declare item public.curriculum_job_items; d jsonb; l public.lessons; a jsonb; n integer;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 -- Lock job before item, matching claim lock order.
 perform 1 from public.curriculum_jobs where id=(select job_id from public.curriculum_job_items where id=p_item) for update;
 select * into item from public.curriculum_job_items where id=p_item for update;
 if not found or item.status<>'running' or item.claim_token<>p_token then raise exception 'Stale worker lease'; end if;
 update public.curriculum_jobs set actual_cost_usd=actual_cost_usd+greatest(coalesce(p_actual_cost,0),0),updated_at=now() where id=item.job_id;
 if p_error is not null then
  update public.curriculum_job_items set status='failed',error=left(p_error,500),
   attempts=case when p_retry then attempts else 3 end,
   next_attempt_at=now()+make_interval(secs=>power(2,attempts)::integer*2) where id=item.id;
  return;
 end if;
 d:=p_output->'lesson';
 if d->>'key'<>item.lesson_key or (d->>'is_published')::boolean is distinct from false then raise exception 'Invalid generated lesson identity'; end if;
 select ls.* into l from public.lessons ls join public.learning_paths p on p.id=ls.learning_path_id
 join public.learning_modules m on m.id=ls.module_id
 where p.slug=item.spec->>'path_slug' and m.slug=item.spec->>'module_slug' and ls.slug=item.spec->>'lesson_slug';
 perform public.curriculum_backup();
 insert into public.curriculum_versions(lesson_id,fingerprint,body,base_updated_at,created_by)
 values(l.id,md5(d::text),d,l.updated_at,auth.uid()) on conflict do nothing;
 -- Generation stages a revision; it never silently applies a changed lesson.
 if jsonb_array_length(coalesce(p_output->'module_assessment','[]'))>0 then
  for a in select value from jsonb_array_elements(p_output->'module_assessment') loop
   select coalesce(max(version),0)+1 into n from public.lesson_activities where module_id=l.module_id and lesson_id is null and slug=a->>'slug';
   insert into public.lesson_activities(module_id,slug,version,body) values(l.module_id,a->>'slug',n,a);
  end loop;
 end if;
 update public.curriculum_job_items set status='completed',output=p_output,error=null where id=item.id;
end $$;
revoke all on function public.curriculum_start_job(uuid,jsonb,jsonb,integer,numeric,jsonb,boolean),public.curriculum_finish(uuid,uuid,jsonb,text,boolean,numeric) from public,anon;
grant execute on function public.curriculum_start_job(uuid,jsonb,jsonb,integer,numeric,jsonb,boolean),public.curriculum_finish(uuid,uuid,jsonb,text,boolean,numeric) to authenticated;
commit;
notify pgrst,'reload schema';

-- >>> MIGRATION: 023_practical_lab_sessions.sql <<<
begin;
create table public.practical_lab_sessions(
 user_id uuid not null references public.profiles(id),challenge_id uuid not null references public.challenges(id),
 version integer not null default 0,state jsonb not null,private_config jsonb not null,private_bugs jsonb not null,
 updated_at timestamptz not null default now(),primary key(user_id,challenge_id)
);
create table public.practical_lab_events(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),
 challenge_id uuid not null references public.challenges(id),request_id uuid not null,
 response jsonb not null,created_at timestamptz not null default now(),unique(user_id,request_id)
);
alter table public.practical_lab_sessions enable row level security;
alter table public.practical_lab_events enable row level security;
create policy private_lab_admin on public.practical_lab_sessions for select to authenticated using(public.curriculum_is_admin());
create policy private_lab_event_admin on public.practical_lab_events for select to authenticated using(public.curriculum_is_admin());
grant select on public.practical_lab_sessions,public.practical_lab_events to authenticated;
grant all on public.practical_lab_sessions,public.practical_lab_events to service_role;
grant select on public.hidden_bugs,public.challenges to service_role;
create or replace function public.practical_lab_commit(p_user uuid,p_challenge uuid,p_request uuid,p_version integer,p_state jsonb,p_config jsonb,p_bugs jsonb,p_response jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare prior public.practical_lab_events; session public.practical_lab_sessions;
begin
 perform pg_advisory_xact_lock(hashtext(p_user::text||p_challenge::text));
 select * into prior from public.practical_lab_events where user_id=p_user and request_id=p_request;
 if found then
  if prior.challenge_id<>p_challenge then raise exception 'Request reused across challenges'; end if;
  return prior.response;
 end if;
 select * into session from public.practical_lab_sessions where user_id=p_user and challenge_id=p_challenge for update;
 if found then
  if session.version<>p_version then raise exception 'Concurrent lab action; retry with current state'; end if;
  update public.practical_lab_sessions set version=version+1,state=p_state,private_config=p_config,private_bugs=p_bugs,updated_at=now()
   where user_id=p_user and challenge_id=p_challenge;
 else
  if p_version<>0 then raise exception 'Session missing'; end if;
  insert into public.practical_lab_sessions(user_id,challenge_id,version,state,private_config,private_bugs)
   values(p_user,p_challenge,1,p_state,p_config,p_bugs);
 end if;
 insert into public.practical_lab_events(user_id,challenge_id,request_id,response) values(p_user,p_challenge,p_request,p_response);
 return p_response;
end $$;
revoke all on function public.practical_lab_commit(uuid,uuid,uuid,integer,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.practical_lab_commit(uuid,uuid,uuid,integer,jsonb,jsonb,jsonb,jsonb) to service_role;
commit;
notify pgrst,'reload schema';

-- >>> MIGRATION: 024_curriculum_backup_and_bug_history.sql <<<
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

-- >>> MIGRATION: 025_bug_report_context.sql <<<
begin;
alter table public.bug_reports add column if not exists environment text not null default '';
alter table public.bug_reports add column if not exists evidence_url text;
alter table public.bug_reports add column if not exists request_id uuid;
create unique index if not exists report_request_once on public.bug_reports(user_id,request_id) where request_id is not null;
commit;
notify pgrst,'reload schema';

-- >>> MIGRATION: 026_curriculum_assessment_review.sql <<<
begin;
create or replace function public.curriculum_stage_assessment(p_module uuid,p_activities jsonb) returns integer
language plpgsql security invoker set search_path=public as $$
declare a jsonb; n integer;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 perform 1 from public.learning_modules where id=p_module for update;
 if not found then raise exception 'Module not found'; end if;
 perform public.curriculum_backup();
 for a in select value from jsonb_array_elements(p_activities) loop
  select coalesce(max(version),0)+1 into n from public.lesson_activities where module_id=p_module and lesson_id is null and slug=a->>'slug';
  insert into public.lesson_activities(module_id,slug,version,body) values(p_module,a->>'slug',n,a);
 end loop;
 return jsonb_array_length(p_activities);
end $$;
revoke all on function public.curriculum_stage_assessment(uuid,jsonb) from public,anon;
grant execute on function public.curriculum_stage_assessment(uuid,jsonb) to authenticated;
create or replace function public.curriculum_check_challenge_links() returns trigger language plpgsql set search_path=public as $$
begin
 if new.module_id is not null and new.learning_path_id is not null and
 not exists(select 1 from public.learning_modules where id=new.module_id and learning_path_id=new.learning_path_id) then raise exception 'Challenge module/path mismatch'; end if;
 if new.lesson_id is not null and new.module_id is not null and
 not exists(select 1 from public.lessons where id=new.lesson_id and module_id=new.module_id) then raise exception 'Challenge lesson/module mismatch'; end if;
 return new;
end $$;
create trigger curriculum_challenge_links before insert or update of module_id,learning_path_id,lesson_id on public.challenges
 for each row execute function public.curriculum_check_challenge_links();
commit;
notify pgrst,'reload schema';

-- >>> MIGRATION: 027_atomic_rewards_and_review_security.sql <<<
begin;
-- Keep historical totals intact; add application-used fields only where absent.
do $$
begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='total_xp') then
  alter table public.profiles add column total_xp integer not null default 0;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='xp') then execute 'update public.profiles set total_xp=xp'; end if;
 end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='current_level') then
  alter table public.profiles add column current_level integer not null default 1;
 end if;
end $$;
create or replace function public.curriculum_protect_profile_rewards() returns trigger language plpgsql set search_path=public as $$
begin
 if current_user not in ('postgres','service_role','supabase_admin') and
 (new.total_xp is distinct from old.total_xp or new.current_level is distinct from old.current_level) then
  raise exception 'Reward totals are server-managed';
 end if; return new;
end $$;
create trigger curriculum_protect_profile_rewards before update on public.profiles for each row execute function public.curriculum_protect_profile_rewards();

create or replace function public.curriculum_protect_attempt() returns trigger language plpgsql set search_path=public as $$
declare j jsonb; k text;
begin
 if current_user in ('postgres','service_role','supabase_admin') or public.curriculum_is_admin() then return new; end if;
 j:=to_jsonb(new);
 if new.user_id is distinct from auth.uid() or new.status::text not in ('started','submitted') then raise exception 'Review state is admin-only'; end if;
 if tg_op='INSERT' then
  if coalesce((j->>'is_passed')::boolean,false) or coalesce((j->>'xp_awarded')::boolean,false) or
   coalesce((j->>'earned_xp')::integer,0)<>0 or coalesce((j->>'awarded_xp')::integer,0)<>0 or
   j->>'score' is not null or j->>'reviewed_by' is not null or j->>'reviewed_at' is not null or j->>'admin_feedback' is not null then
   raise exception 'Review fields are admin-only'; end if;
 else
  if old.status::text not in ('started','submitted') or
   (to_jsonb(new)-array['status','submitted_at','updated_at','time_spent_seconds','last_activity_at'])
    is distinct from (to_jsonb(old)-array['status','submitted_at','updated_at','time_spent_seconds','last_activity_at']) then
   raise exception 'Review fields and attempt identity are admin-only';
  end if;
 end if;
 return new;
end $$;
create trigger curriculum_protect_attempt before insert or update on public.challenge_attempts
 for each row execute function public.curriculum_protect_attempt();

create or replace function public.curriculum_badges(p_user uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare keys text[]:='{}'; key text; bid uuid; created uuid; earned jsonb:='[]'; n integer;
begin
 if auth.uid() is distinct from p_user and not public.curriculum_is_admin() then raise exception 'Forbidden'; end if;
 if exists(select 1 from public.lesson_progress where user_id=p_user and completed_at is not null) then keys:=array_append(keys,'first_lesson_completed'); end if;
 if exists(select 1 from public.bug_reports where user_id=p_user) then keys:=array_append(keys,'first_bug_report'); end if;
 select count(distinct challenge_id) into n from public.challenge_attempts where user_id=p_user and status::text='approved';
 if n>=1 then keys:=array_append(keys,'first_approved_challenge'); end if;
 if n>=3 then keys:=array_append(keys,'three_challenges_completed'); end if;
 if (select count(*) from public.bug_reports where user_id=p_user and admin_classification='valid_bug')>=10 then keys:=array_append(keys,'ten_valid_bug_reports'); end if;
 if exists(select 1 from public.xp_transactions where user_id=p_user and reason='perfect_challenge') then keys:=array_append(keys,'perfect_bug_hunt'); end if;
 foreach key in array keys loop
  select id into bid from public.badges where badge_key=key;
  if bid is not null then
   created:=null;
   insert into public.user_badges(user_id,badge_id,earned_at) values(p_user,bid,now()) on conflict do nothing returning badge_id into created;
   if created is not null then earned:=earned||jsonb_build_array(key); end if;
  end if;
 end loop;
 return earned;
end $$;

create or replace function public.curriculum_award_lesson(p_lesson uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); l public.lessons; previous integer; total integer; lvl integer; n integer; award integer:=0; badges jsonb;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select * into l from public.lessons where id=p_lesson and is_published;
 if not found or not public.curriculum_can_read_module(l.module_id) or
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

create or replace function public.curriculum_award_challenge(p_attempt uuid,p_found uuid[]) returns jsonb
language plpgsql security definer set search_path=public as $$
declare a public.challenge_attempts; c public.challenges; b record; previous integer; total integer; lvl integer; award integer:=0;
 n integer; found_count integer; all_count integer; perfect boolean:=false; badges jsonb;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 select * into a from public.challenge_attempts where id=p_attempt for update;
 if not found or a.status::text<>'approved' then raise exception 'Approved attempt required'; end if;
 select * into c from public.challenges where id=a.challenge_id;
 select coalesce(current_level,1) into previous from public.profiles where id=a.user_id for update;
 -- Serialize by profile and award each challenge once across all retries, preserving historical transactions.
 if not a.xp_awarded and not exists(select 1 from public.challenge_attempts old
   where old.user_id=a.user_id and old.challenge_id=a.challenge_id and old.id<>a.id and old.xp_awarded)
  and not exists(select 1 from public.xp_transactions tx join public.challenge_attempts old on old.id=tx.source_id
   where tx.user_id=a.user_id and tx.reason='challenge_approved' and old.challenge_id=a.challenge_id) then
  if c.base_xp_reward>0 then
   insert into public.xp_transactions(user_id,source_type,source_id,amount,reason,metadata)
   values(a.user_id,'challenge_attempt',a.id,c.base_xp_reward,'challenge_approved',jsonb_build_object('challengeId',c.id)) on conflict do nothing;
   get diagnostics n=row_count;
   if n=1 then award:=c.base_xp_reward; end if;
  end if;
  select count(*) into all_count from public.hidden_bugs where challenge_id=c.id and is_active;
  select count(distinct id) into found_count from public.hidden_bugs where challenge_id=c.id and is_active and id=any(p_found);
  for b in select id,bonus_xp from public.hidden_bugs where challenge_id=c.id and is_active and id=any(p_found) loop
   if b.bonus_xp>0 then
    insert into public.xp_transactions(user_id,source_type,source_id,amount,reason,metadata)
    values(a.user_id,'challenge_attempt',a.id,b.bonus_xp,'bug_bonus',jsonb_build_object('hiddenBugId',b.id,'challengeId',c.id));
    award:=award+b.bonus_xp;
   end if;
  end loop;
  perfect:=all_count>0 and found_count=all_count;
  if perfect then
   insert into public.xp_transactions(user_id,source_type,source_id,amount,reason,metadata)
   values(a.user_id,'challenge_attempt',a.id,25,'perfect_challenge',jsonb_build_object('challengeId',c.id)) on conflict do nothing;
   get diagnostics n=row_count;if n=1 then award:=award+25; end if;
  end if;
  update public.profiles set total_xp=coalesce(total_xp,0)+award where id=a.user_id;
 end if;
 if not a.xp_awarded then update public.challenge_attempts set xp_awarded=true,awarded_xp=award,earned_xp=award where id=a.id; end if;
 select coalesce(total_xp,0) into total from public.profiles where id=a.user_id;
 lvl:=greatest(1,floor((1+sqrt(1+4*total::numeric/75))/2)::integer);
 update public.profiles set current_level=lvl where id=a.user_id;
 badges:=public.curriculum_badges(a.user_id);
 return jsonb_build_object('awarded',award>0,'totalXpAwarded',award,'newTotalXp',total,'newLevel',lvl,'previousLevel',previous,'leveledUp',lvl>previous,'newBadges',badges);
end $$;
-- Admin review must be able to synchronize another learner's progress.
create policy curriculum_module_progress_admin on public.module_progress for all to authenticated using(public.curriculum_is_admin()) with check(public.curriculum_is_admin());
create policy curriculum_path_progress_admin on public.learning_path_progress for all to authenticated using(public.curriculum_is_admin()) with check(public.curriculum_is_admin());
revoke all on function public.curriculum_badges(uuid),public.curriculum_award_lesson(uuid),public.curriculum_award_challenge(uuid,uuid[]) from public,anon;
grant execute on function public.curriculum_badges(uuid),public.curriculum_award_lesson(uuid),public.curriculum_award_challenge(uuid,uuid[]) to authenticated;
commit;
notify pgrst,'reload schema';

-- >>> MIGRATION: 028_report_review_security.sql <<<
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

-- >>> MIGRATION: 029_complete_module_progression.sql <<<
begin;
create or replace function public.curriculum_can_read_module(p_module uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select auth.uid() is not null and exists(
 select 1 from public.learning_modules m join public.learning_paths p on p.id=m.learning_path_id
 where m.id=p_module and m.is_published and p.is_active
 and not exists(
  select 1 from public.learning_modules prior where prior.learning_path_id=m.learning_path_id and prior.is_published and prior.sort_order<m.sort_order
  and (exists(select 1 from public.lessons l where l.module_id=prior.id and (not l.is_published or not exists(
   select 1 from public.lesson_progress lp where lp.lesson_id=l.id and lp.user_id=auth.uid() and lp.completed_at is not null)))
  or exists(select 1 from public.challenges c where c.module_id=prior.id and c.is_active and c.is_required and not exists(
   select 1 from public.challenge_attempts ca where ca.challenge_id=c.id and ca.user_id=auth.uid() and ca.is_passed=true)))
 )) $$;

create or replace function public.curriculum_get_activities(p_lesson uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare l public.lessons;
begin
 select * into l from public.lessons where id=p_lesson and is_published;
 if not found or not public.curriculum_can_read_module(l.module_id) then raise exception 'Lesson unavailable'; end if;
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
 if a.lesson_id is not null and not exists(select 1 from public.lessons where id=a.lesson_id and is_published) then raise exception 'Lesson unavailable'; end if;
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

create or replace function public.curriculum_can_enter_lab(p_challenge uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.challenges c where c.id=p_challenge and c.is_active and c.status='published'
 and public.curriculum_can_read_module(c.module_id)
 and exists(select 1 from public.lessons l where l.module_id=c.module_id)
 and not exists(select 1 from public.lessons l where l.module_id=c.module_id and
  (not l.is_published or not exists(select 1 from public.lesson_progress p where p.lesson_id=l.id and p.user_id=auth.uid() and p.completed_at is not null))))
$$;
revoke all on function public.curriculum_can_enter_lab(uuid) from public,anon;
grant execute on function public.curriculum_can_enter_lab(uuid) to authenticated;
commit;
notify pgrst,'reload schema';

-- >>> MIGRATION: 030_admin_reward_inspection.sql <<<
begin;
-- Reviewers must be able to inspect the rewards they awarded to another learner.
create policy curriculum_profiles_admin_read on public.profiles for select to authenticated using(public.curriculum_is_admin());
create policy curriculum_xp_admin_read on public.xp_transactions for select to authenticated using(public.curriculum_is_admin());
create policy curriculum_badges_admin_read on public.user_badges for select to authenticated using(public.curriculum_is_admin());
commit;
notify pgrst,'reload schema';

-- >>> MIGRATION: 031_manifest_prerequisites.sql <<<
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

-- >>> MIGRATION: 032_private_review_metadata.sql <<<
begin;
-- RLS protects rows, not columns. Historical reward/report records retain their
-- private bug associations, but the shared authenticated role cannot read them.
do $$
declare target record; safe_columns text;
begin
 for target in select * from (values
  ('xp_transactions','metadata'),('bug_reports','matched_hidden_bug_id'),
  ('ai_evaluations','matched_hidden_bug_id')) as tables(table_name,private_column) loop
  select string_agg(quote_ident(column_name),',' order by ordinal_position) into safe_columns
   from information_schema.columns where table_schema='public' and table_name=target.table_name
    and column_name<>target.private_column;
  if safe_columns is null then raise exception 'Required review table missing: %',target.table_name; end if;
  execute format('revoke select on public.%I from public,anon,authenticated',target.table_name);
  execute format('revoke select(%I) on public.%I from public,anon,authenticated',target.private_column,target.table_name);
  execute format('grant select(%s) on public.%I to authenticated',safe_columns,target.table_name);
 end loop;
end $$;

create or replace function public.curriculum_admin_review_details(p_attempt uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 return jsonb_build_object(
  'reports',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.bug_reports r where r.attempt_id=p_attempt),'[]'),
  'awarded_bug_ids',coalesce((select jsonb_agg(metadata->>'hiddenBugId') from public.xp_transactions
   where source_id=p_attempt and reason='bug_bonus' and metadata->>'hiddenBugId' is not null),'[]'));
end $$;
revoke all on function public.curriculum_admin_review_details(uuid) from public,anon;
grant execute on function public.curriculum_admin_review_details(uuid) to authenticated;
commit;
notify pgrst,'reload schema';

-- >>> MIGRATION: 033_curriculum_revision_approval.sql <<<
begin;

create or replace function public.curriculum_approve_version(p_version uuid) returns uuid
language plpgsql security invoker set search_path=public as $$
declare v public.curriculum_versions; l public.lessons;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 select * into v from public.curriculum_versions where id=p_version for update;
 if not found or v.status<>'needs_review' then raise exception 'Revision must be awaiting review'; end if;
 select * into l from public.lessons where id=v.lesson_id for update;
 if not found or l.is_published then raise exception 'Only unpublished lessons can receive an approved revision'; end if;
 perform public.curriculum_backup();
 update public.curriculum_versions set status='approved' where id=v.id;
 return v.id;
end $$;

create or replace function public.curriculum_apply_version(p_version uuid,p_expected_updated timestamptz) returns uuid
language plpgsql security invoker set search_path=public as $$
declare v public.curriculum_versions; l public.lessons; a jsonb; n integer;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 select * into v from public.curriculum_versions where id=p_version for update;
 if not found or v.status<>'approved' then raise exception 'Revision must be explicitly approved first'; end if;
 select * into l from public.lessons where id=v.lesson_id for update;
 if l.is_published then raise exception 'Unpublish explicitly before applying a revision'; end if;
 if l.updated_at<>p_expected_updated or v.base_updated_at<>p_expected_updated then raise exception 'Lesson changed; regenerate or review a fresh revision'; end if;
 perform public.curriculum_backup();
 update public.lessons set content=v.body->>'content_en',content_en=v.body->>'content_en',content_ar=v.body->>'content_ar',
 summary_en=v.body->>'summary_en',summary_ar=v.body->>'summary_ar',title_en=v.body->>'title_en',title_ar=v.body->>'title_ar',
 objectives_en=array(select jsonb_array_elements_text(v.body->'objectives_en')),
 objectives_ar=array(select jsonb_array_elements_text(v.body->'objectives_ar')),
 estimated_minutes=(v.body->>'estimated_minutes')::integer,updated_at=now() where id=l.id;
 update public.lesson_activities set retired=true,is_published=false where lesson_id=l.id;
 for a in select value from jsonb_array_elements(v.body->'activities') loop
  select coalesce(max(version),0)+1 into n from public.lesson_activities where lesson_id=l.id and slug=a->>'slug';
  insert into public.lesson_activities(lesson_id,module_id,slug,version,body) values(l.id,l.module_id,a->>'slug',n,a);
 end loop;
 update public.curriculum_versions set status='applied' where id=v.id;
 return l.id;
end $$;

revoke all on function public.curriculum_approve_version(uuid) from public,anon;
grant execute on function public.curriculum_approve_version(uuid) to authenticated;
commit;
notify pgrst,'reload schema';

-- Refresh PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';


-- ==========================================================================
-- TestCraft Migrations 034-latest (Educational Engine + Progress Tables)
-- Apply in Supabase Dashboard -> SQL Editor AFTER apply_curriculum_factory_migrations.sql
-- ==========================================================================

-- >>> MIGRATION: 034_simple_curriculum.sql <<<
-- Additive educational rebuild. No existing rows, progress, rewards or challenges are deleted.
-- Safe to rerun after a failed/partial SQL Editor attempt or a successful upgrade.
-- Restores the educational prerequisite contract even when migration 031 was missed.
begin;
-- Report missing base dependencies BEFORE making any schema changes. Do not
-- replay destructive historical migrations or invent replacement progress/XP tables.
do $$
declare missing text; requirement record;
begin
 select string_agg(name,', ' order by name) into missing from unnest(array[
  'profiles','learning_paths','learning_modules','lessons','lesson_progress',
  'module_progress','learning_path_progress','challenges','challenge_attempts','hidden_bugs',
  'curriculum_backups','curriculum_sources','curriculum_versions','lesson_activities','activity_attempts',
  'xp_transactions','badges','user_badges','bug_reports'
 ]) as required(name) where to_regclass('public.'||name) is null;
 if missing is not null then
  raise exception 'Curriculum base tables are missing: %',missing using errcode='42P01',
   hint='Reconcile the existing project migration history and apply the missing foundation/factory migrations through 030 before this file. Do not reset the database.';
 end if;
 select string_agg(signature,', ' order by signature) into missing from unnest(array[
  'auth.uid()','public.curriculum_is_admin()','public.curriculum_badges(uuid)'
 ]) as required(signature) where to_regprocedure(signature) is null;
 if missing is not null then
  raise exception 'Curriculum base functions are missing: %',missing using errcode='42883',
   hint='Apply the existing curriculum factory/reward migrations (021 and 027) from the verified project migration history before this file.';
 end if;
 missing:=null;
 for requirement in select * from (values
  ('profiles',array['id','role','total_xp','current_level']),
  ('learning_paths',array['id','slug','title','description','title_en','title_ar','description_en','description_ar','sort_order','is_active','updated_at']),
  ('learning_modules',array['id','learning_path_id','slug','title_en','title_ar','description_en','description_ar','sort_order','is_published']),
  ('lessons',array['id','learning_path_id','module_id','slug','title','content','title_en','title_ar','summary_en','summary_ar','content_en','content_ar','objectives_en','objectives_ar','estimated_minutes','difficulty','sort_order','is_published','updated_at']),
  ('lesson_progress',array['user_id','lesson_id','completed_at']),
  ('challenges',array['id','module_id','is_active','is_required']),
  ('challenge_attempts',array['user_id','challenge_id','is_passed']),
  ('lesson_activities',array['id','module_id','lesson_id','slug','version','body','is_published','retired']),
  ('activity_attempts',array['id','activity_id','user_id','request_id','response','status','score','feedback']),
  ('curriculum_backups',array['id','created_by','payload']),
  ('curriculum_sources',array['id','fingerprint','manifest','created_by']),
  ('xp_transactions',array['user_id','source_type','source_id','amount','reason','metadata'])
 ) as required(table_name,column_names) loop
  select concat_ws(', ',nullif(missing,''),string_agg(requirement.table_name||'.'||name,', ' order by name)) into missing
   from unnest(requirement.column_names) as required_column(name) where not exists(
    select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=requirement.table_name and c.column_name=name);
 end loop;
 if nullif(missing,'') is not null then
  raise exception 'Curriculum base columns are missing: %',missing using errcode='42703',
   hint='Reconcile the missing base migrations before running this upgrade. No curriculum data has been changed.';
 end if;
end $$;

-- Exact table contract from 031; retain all existing prerequisite links.
create table if not exists public.lesson_prerequisites(
 lesson_id uuid not null references public.lessons(id),prerequisite_id uuid not null references public.lessons(id),
 primary key(lesson_id,prerequisite_id),check(lesson_id<>prerequisite_id)
);
alter table public.lesson_prerequisites enable row level security;
drop policy if exists prerequisite_admin on public.lesson_prerequisites;
create policy prerequisite_admin on public.lesson_prerequisites for all to authenticated
 using(public.curriculum_is_admin()) with check(public.curriculum_is_admin());
revoke all on public.lesson_prerequisites from public,anon;
grant select,insert,update on public.lesson_prerequisites to authenticated;

alter table public.learning_paths add column if not exists archived_at timestamptz;
alter table public.learning_modules add column if not exists archived_at timestamptz;
alter table public.lessons add column if not exists archived_at timestamptz;

-- Existing production tables already have timestamps; also make this explicit for old installs.
alter table public.learning_paths add column if not exists created_at timestamptz not null default now();
alter table public.learning_modules add column if not exists created_at timestamptz not null default now();
alter table public.lessons add column if not exists created_at timestamptz not null default now();
alter table public.learning_modules add column if not exists updated_at timestamptz not null default now();
create or replace function public.curriculum_touch() returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=clock_timestamp(); return new; end $$;
drop trigger if exists curriculum_touch_path on public.learning_paths;
create trigger curriculum_touch_path before update on public.learning_paths for each row execute function public.curriculum_touch();
drop trigger if exists curriculum_touch_module on public.learning_modules;
create trigger curriculum_touch_module before update on public.learning_modules for each row execute function public.curriculum_touch();
drop trigger if exists curriculum_touch_lesson on public.lessons;
create trigger curriculum_touch_lesson before update on public.lessons for each row execute function public.curriculum_touch();
create or replace function public.curriculum_guard_module_move() returns trigger language plpgsql set search_path=public as $$
begin
 if new.learning_path_id<>old.learning_path_id and (exists(select 1 from public.lessons where module_id=old.id)
 or exists(select 1 from public.challenges where module_id=old.id)) then raise exception 'A module with linked content cannot be moved to another path'; end if;
 return new;
end $$;
drop trigger if exists curriculum_guard_module_move on public.learning_modules;
create trigger curriculum_guard_module_move before update of learning_path_id on public.learning_modules for each row execute function public.curriculum_guard_module_move();

-- RESTRICTIVE policies also constrain older permissive SELECT policies.
drop policy if exists curriculum_visible_path on public.learning_paths;
create policy curriculum_visible_path on public.learning_paths as restrictive for select to authenticated
 using(public.curriculum_is_admin() or (is_active and archived_at is null));
drop policy if exists curriculum_visible_module on public.learning_modules;
create policy curriculum_visible_module on public.learning_modules as restrictive for select to authenticated
 using(public.curriculum_is_admin() or (is_published and archived_at is null and exists(
 select 1 from public.learning_paths p where p.id=learning_path_id and p.is_active and p.archived_at is null)));
drop policy if exists curriculum_visible_lesson on public.lessons;
create policy curriculum_visible_lesson on public.lessons as restrictive for select to authenticated
 using(public.curriculum_is_admin() or (is_published and archived_at is null and exists(
 select 1 from public.learning_paths p where p.id=learning_path_id and p.is_active and p.archived_at is null)
 and (module_id is null or exists(select 1 from public.learning_modules m where m.id=module_id and m.is_published and m.archived_at is null))));

create or replace function public.curriculum_export_json() returns jsonb
language plpgsql stable security invoker set search_path=public as $$
declare doc jsonb;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 select jsonb_build_object('format','testcraft-curriculum-v1','paths',coalesce(jsonb_agg(
 jsonb_build_object('id',p.id,'slug',p.slug,'title_en',coalesce(p.title_en,''),'title_ar',coalesce(p.title_ar,''),
 'description_en',coalesce(p.description_en,''),'description_ar',coalesce(p.description_ar,''),'sort_order',p.sort_order,
 'status',case when p.archived_at is not null then 'archived' when p.is_active then 'published' else 'draft' end,
 'modules',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'slug',m.slug,'title_en',m.title_en,'title_ar',coalesce(m.title_ar,''),
 'description_en',coalesce(m.description_en,''),'description_ar',coalesce(m.description_ar,''),'sort_order',m.sort_order,
 'status',case when m.archived_at is not null then 'archived' when m.is_published then 'published' else 'draft' end,
 'lessons',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'slug',l.slug,'title_en',coalesce(l.title_en,''),'title_ar',coalesce(l.title_ar,''),
 'summary_en',coalesce(l.summary_en,''),'summary_ar',coalesce(l.summary_ar,''),'content_en',coalesce(l.content_en,''),'content_ar',coalesce(l.content_ar,''),
 'objectives_en',coalesce(to_jsonb(l.objectives_en),'[]'),'objectives_ar',coalesce(to_jsonb(l.objectives_ar),'[]'),
 'estimated_minutes',coalesce(l.estimated_minutes,10),'difficulty',coalesce(l.difficulty::text,'Beginner'),'sort_order',l.sort_order,
 'status',case when l.archived_at is not null then 'archived' when l.is_published then 'published' else 'draft' end,
 'practice',coalesce((select jsonb_agg(a.body order by (a.body->>'sort_order')::integer,a.slug) from public.lesson_activities a
 where a.lesson_id=l.id and not a.retired),'[]')) order by l.sort_order,l.slug) from public.lessons l where l.module_id=m.id),'[]'))
 order by m.sort_order,m.slug) from public.learning_modules m where m.learning_path_id=p.id),'[]')) order by p.sort_order,p.slug),'[]'))
 into doc from public.learning_paths p;
 -- Never silently omit legacy lessons that predate the module hierarchy.
 if exists(select 1 from public.lessons where module_id is null) then
  doc:=doc||jsonb_build_object('unassigned_lessons',(select jsonb_agg(to_jsonb(l) order by l.learning_path_id,l.sort_order,l.slug) from public.lessons l where l.module_id is null));
 end if;
 -- Include timestamps in the revision, so concurrent manual edits always invalidate preview.
 return jsonb_build_object('document',doc,'revision',md5(doc::text || coalesce((select string_agg(updated_at::text,',' order by id) from public.lessons),'')));
end $$;

-- Validate the entire normalized document on the DB boundary as well as in the API.
create or replace function public.curriculum_validate_json(p_document jsonb) returns void
language plpgsql security invoker set search_path=public as $$
declare p jsonb; m jsonb; l jsonb; a jsonb; v jsonb; k text; seen text[]:='{}'; modules text[]; lessons text[]; activities text[];
 prev integer; mp integer; lp integer; total integer:=0; slug_pattern text:='^[a-z0-9]+(-[a-z0-9]+)*$';
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 if p_document->>'format' is distinct from 'testcraft-curriculum-v1' or jsonb_typeof(p_document->'paths') is distinct from 'array'
 or jsonb_array_length(p_document->'paths') not between 1 and 100 then raise exception 'Invalid curriculum document'; end if;
 if coalesce(jsonb_array_length(p_document->'unassigned_lessons'),0)>0 then raise exception 'Assign legacy lessons to modules before importing'; end if;
 prev:=-1;
 for p in select value from jsonb_array_elements(p_document->'paths') loop
  if coalesce(p->>'slug','') !~ slug_pattern or p->>'slug'=any(seen) then raise exception 'Invalid or duplicate path slug'; end if;
  seen:=array_append(seen,p->>'slug'); modules:='{}'; lessons:='{}';
  if (p->>'sort_order')::integer<=prev then raise exception 'Path ordering must follow array order'; end if;
  prev:=(p->>'sort_order')::integer;
  if jsonb_typeof(p->'modules') is distinct from 'array' then raise exception 'Invalid modules'; end if;
  mp:=-1;
  for m in select value from jsonb_array_elements(p->'modules') loop
   if coalesce(m->>'slug','') !~ slug_pattern or m->>'slug'=any(modules) then raise exception 'Invalid or duplicate module slug'; end if;
   modules:=array_append(modules,m->>'slug');
   if (m->>'sort_order')::integer<=mp then raise exception 'Module ordering must follow array order'; end if;
   mp:=(m->>'sort_order')::integer;
   if jsonb_typeof(m->'lessons') is distinct from 'array' then raise exception 'Invalid lessons'; end if;
   lp:=-1;
   for l in select value from jsonb_array_elements(m->'lessons') loop
    total:=total+1;
    if coalesce(l->>'slug','') !~ slug_pattern or l->>'slug'=any(lessons) then raise exception 'Invalid or duplicate lesson slug within path'; end if;
    lessons:=array_append(lessons,l->>'slug');
    if (l->>'sort_order')::integer<=lp then raise exception 'Lesson ordering must follow array order'; end if;
    lp:=(l->>'sort_order')::integer;
    if length(trim(coalesce(l->>'content_en','')))=0 or length(trim(coalesce(l->>'content_ar','')))=0 then raise exception 'Complete bilingual Markdown required'; end if;
    if jsonb_typeof(l->'estimated_minutes') is distinct from 'number' or (l->>'estimated_minutes')::integer not between 1 and 240 then raise exception 'Invalid duration'; end if;
    if l->>'difficulty' is null or l->>'difficulty' not in ('Beginner','Intermediate','Advanced') then raise exception 'Invalid difficulty'; end if;
    if jsonb_typeof(l->'objectives_en') is distinct from 'array' or jsonb_typeof(l->'objectives_ar') is distinct from 'array'
      or jsonb_typeof(l->'practice') is distinct from 'array' or jsonb_array_length(l->'practice')>30 then raise exception 'Invalid objectives/practice'; end if;
    activities:='{}';
    for a in select value from jsonb_array_elements(l->'practice') loop
     if coalesce(a->>'slug','') !~ slug_pattern or a->>'slug'=any(activities) then raise exception 'Invalid or duplicate exercise slug'; end if;
     activities:=array_append(activities,a->>'slug');
     if a->>'kind' not in ('single_choice','multi_select','true_false','scenario','short_answer') or a->>'kind' is null
      or jsonb_typeof(a->'options') is distinct from 'array' or jsonb_typeof(a->'answer') is distinct from 'array'
      or jsonb_typeof(a->'rubric') is distinct from 'array' then raise exception 'Invalid practice exercise'; end if;
     foreach k in array array['en','ar'] loop
      if length(trim(coalesce(a->'prompt'->>k,'')))<15 or length(trim(coalesce(a->'explanation'->>k,'')))<30 then raise exception 'Bilingual practice prompt/explanation required'; end if;
     end loop;
     if a->>'kind'<>'short_answer' and (jsonb_array_length(a->'options')<2 or jsonb_array_length(a->'answer')=0
      or exists(select 1 from jsonb_array_elements_text(a->'answer') ans where not exists(select 1 from jsonb_array_elements(a->'options') o where o->>'id'=ans.value)))
      then raise exception 'Invalid exercise answers'; end if;
    end loop;
   end loop;
  end loop;
 end loop;
 -- Shared entity constraints, including required scalar types/order, for direct RPC callers.
 for v in select value from jsonb_array_elements(p_document->'paths')
  union all select mod_item.value from jsonb_array_elements(p_document->'paths') path_item cross join lateral jsonb_array_elements(path_item.value->'modules') mod_item
  union all select lesson_item.value from jsonb_array_elements(p_document->'paths') path_item cross join lateral jsonb_array_elements(path_item.value->'modules') mod_item cross join lateral jsonb_array_elements(mod_item.value->'lessons') lesson_item loop
  foreach k in array array['title_en','title_ar'] loop
   if jsonb_typeof(v->k) is distinct from 'string' or length(trim(v->>k)) not between 2 and 120 then raise exception 'Bilingual titles required'; end if;
  end loop;
  if jsonb_typeof(v->'sort_order') is distinct from 'number' or (v->>'sort_order')::integer not between 0 and 1000000 then raise exception 'Invalid ordering'; end if;
 end loop;
 if total>10000 then raise exception 'Maximum 10000 lessons'; end if;
end $$;

create or replace function public.curriculum_prepare_json(p_document jsonb,p_revision text,p_fingerprint text) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare sid uuid; bid uuid;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 perform pg_advisory_xact_lock(hashtext('testcraft-curriculum-import'));
 perform public.curriculum_validate_json(p_document);
 if (public.curriculum_export_json()->>'revision') is distinct from p_revision then raise exception 'Curriculum changed after preview' using errcode='40001'; end if;
 if exists(select 1 from jsonb_array_elements(p_document->'paths') p
 cross join lateral jsonb_array_elements(p->'modules') m cross join lateral jsonb_array_elements(m->'lessons') l
 join public.learning_paths ep on ep.slug=p->>'slug' join public.lessons el on el.learning_path_id=ep.id and el.slug=l->>'slug'
 left join public.learning_modules em on em.id=el.module_id where em.slug is distinct from m->>'slug') then
  raise exception 'Existing lesson belongs to another module'; end if;
 bid:=public.curriculum_backup();
 -- A fresh attempt uses a new source fingerprint; repeat batches use the returned source ID.
 insert into public.curriculum_sources(fingerprint,manifest,created_by)
 values(p_fingerprint||':'||gen_random_uuid()::text,p_document,auth.uid()) returning id into sid;
 return jsonb_build_object('source_id',sid,'backup_id',bid,'batch_size',25);
end $$;

create or replace function public.curriculum_import_json_batch(p_source uuid,p_offset integer,p_limit integer default 25) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare doc jsonb; p jsonb; m jsonb; l jsonb; a jsonb; pid uuid; mid uuid; lid uuid; n integer:=0; processed integer:=0;
 ip integer:=0; im integer:=0; il integer:=0; kept integer:=0; fresh boolean; total integer; all_keys jsonb:='[]';
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 if p_offset<0 or p_limit not between 1 and 50 then raise exception 'Invalid batch bounds'; end if;
 perform pg_advisory_xact_lock(hashtext('testcraft-curriculum-import'));
 select manifest into doc from public.curriculum_sources where id=p_source and manifest->>'format'='testcraft-curriculum-v1';
 if not found then raise exception 'Import source not found'; end if;
 select coalesce(sum(jsonb_array_length(mod_item.value->'lessons')),0)::integer into total from jsonb_array_elements(doc->'paths') path_item cross join lateral jsonb_array_elements(path_item.value->'modules') mod_item;
 if p_offset>total then raise exception 'Batch offset exceeds lesson count'; end if;
 for p in select value from jsonb_array_elements(doc->'paths') loop
  -- Create hierarchy even for intentionally empty paths/modules, on the first batch only.
  pid:=null; select id into pid from public.learning_paths where slug=p->>'slug';
  if pid is null and p_offset=0 then
   insert into public.learning_paths(slug,title,description,title_en,title_ar,description_en,description_ar,sort_order,is_active)
   values(p->>'slug',p->>'title_en',p->>'description_en',p->>'title_en',p->>'title_ar',p->>'description_en',p->>'description_ar',(p->>'sort_order')::integer,false) returning id into pid;
   ip:=ip+1;
  end if;
  for m in select value from jsonb_array_elements(p->'modules') loop
   mid:=null; select id into mid from public.learning_modules where learning_path_id=pid and slug=m->>'slug';
   if mid is null and p_offset=0 then
    insert into public.learning_modules(learning_path_id,slug,title_en,title_ar,description_en,description_ar,sort_order,is_published)
    values(pid,m->>'slug',m->>'title_en',m->>'title_ar',m->>'description_en',m->>'description_ar',(m->>'sort_order')::integer,false) returning id into mid;
    im:=im+1;
   end if;
   for l in select value from jsonb_array_elements(m->'lessons') loop
    if n>=p_offset and n<p_offset+p_limit then
     if pid is null or mid is null then raise exception 'Start the import at batch zero'; end if;
     lid:=null; select id into lid from public.lessons where learning_path_id=pid and slug=l->>'slug';
     if lid is not null and not exists(select 1 from public.lessons where id=lid and module_id=mid) then raise exception 'Lesson module changed during import'; end if;
     fresh:=lid is null;
     if fresh then
      insert into public.lessons(learning_path_id,module_id,slug,title,content,title_en,title_ar,summary_en,summary_ar,content_en,content_ar,
       objectives_en,objectives_ar,estimated_minutes,difficulty,sort_order,is_published)
      values(pid,mid,l->>'slug',l->>'title_en',l->>'content_en',l->>'title_en',l->>'title_ar',l->>'summary_en',l->>'summary_ar',l->>'content_en',l->>'content_ar',
       array(select jsonb_array_elements_text(l->'objectives_en')),array(select jsonb_array_elements_text(l->'objectives_ar')),
       (l->>'estimated_minutes')::integer,(l->>'difficulty')::public.difficulty_level,(l->>'sort_order')::integer,false) returning id into lid;
      for a in select value from jsonb_array_elements(l->'practice') loop
       insert into public.lesson_activities(lesson_id,module_id,slug,body) values(lid,mid,a->>'slug',a);
      end loop;
      il:=il+1;
     else kept:=kept+1;
     end if;
     processed:=processed+1;
     all_keys:=all_keys||jsonb_build_array(jsonb_build_object('key',(p->>'slug')||'/'||(m->>'slug')||'/'||(l->>'slug'),'action',case when fresh then 'created' else 'kept_existing' end));
    end if;
    n:=n+1;
   end loop;
  end loop;
 end loop;
 return jsonb_build_object('inserted_paths',ip,'inserted_modules',im,'inserted_lessons',il,'kept_existing',kept,
 'processed',processed,'total',total,'next_offset',least(p_offset+p_limit,total),'done',p_offset+p_limit>=total,'published',0,'results',all_keys);
end $$;

create or replace function public.curriculum_publish(p_lesson uuid,p_acknowledged boolean) returns void
language plpgsql security invoker set search_path=public as $$
declare l public.lessons;
begin
 if not public.curriculum_is_admin() or p_acknowledged is distinct from true then raise exception 'Explicit administrator approval required'; end if;
 select * into l from public.lessons where id=p_lesson for update;
 if not found or l.module_id is null or l.archived_at is not null or length(trim(coalesce(l.content_en,'')))=0
 or length(trim(coalesce(l.content_ar,'')))=0 or length(trim(coalesce(l.title_en,'')))=0 or length(trim(coalesce(l.title_ar,'')))=0 then raise exception 'Complete bilingual lesson required; restore archived content first'; end if;
 if exists(select 1 from public.learning_paths where id=l.learning_path_id and archived_at is not null)
 or exists(select 1 from public.learning_modules where id=l.module_id and archived_at is not null) then raise exception 'Restore archived parents first'; end if;
 perform public.curriculum_backup();
 update public.learning_paths set is_active=true where id=l.learning_path_id;
 update public.learning_modules set is_published=true where id=l.module_id;
 update public.lessons set is_published=true where id=l.id;
 update public.lesson_activities set is_published=true where lesson_id=l.id and not retired;
 update public.lesson_activities a set is_published=(a.version=(select max(b.version) from public.lesson_activities b where b.module_id=a.module_id and b.lesson_id is null and b.slug=a.slug)) where a.module_id=l.module_id and a.lesson_id is null;
end $$;

create or replace function public.curriculum_set_state(p_kind text,p_id uuid,p_state text) returns void
language plpgsql security invoker set search_path=public as $$
declare tbl text; flag text; affected integer;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 tbl:=case p_kind when 'path' then 'learning_paths' when 'module' then 'learning_modules' when 'lesson' then 'lessons' end;
 flag:=case p_kind when 'path' then 'is_active' else 'is_published' end;
 if tbl is null or p_state not in ('draft','published','archived') then raise exception 'Invalid curriculum state'; end if;
 if p_kind='lesson' and p_state='published' then perform public.curriculum_publish(p_id,true); return; end if;
 perform public.curriculum_backup();
 execute format('update public.%I set archived_at=case when $1=''archived'' then now() else null end,%I=($1=''published'') where id=$2',tbl,flag) using p_state,p_id;
 get diagnostics affected=row_count;
 if affected<>1 then raise exception 'Curriculum record not found'; end if;
end $$;

create or replace function public.curriculum_save_practice(p_lesson uuid,p_expected_updated timestamptz,p_practice jsonb) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare l public.lessons; a jsonb; version_number integer; touched timestamptz;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 select * into l from public.lessons where id=p_lesson for update;
 if not found or l.module_id is null then raise exception 'Lesson with a module required'; end if;
 if l.is_published then raise exception 'Unpublish the lesson before editing exercises'; end if;
 if l.updated_at is distinct from p_expected_updated then raise exception 'Lesson changed. Reload before saving exercises' using errcode='40001'; end if;
 if jsonb_typeof(p_practice) is distinct from 'array' or jsonb_array_length(p_practice)>30 then raise exception 'Invalid practice exercises'; end if;
 if (select count(distinct value->>'slug') from jsonb_array_elements(p_practice))<>jsonb_array_length(p_practice)
 or (select count(distinct (value->>'sort_order')::integer) from jsonb_array_elements(p_practice))<>jsonb_array_length(p_practice) then raise exception 'Duplicate or missing exercise slugs/order'; end if;
 for a in select value from jsonb_array_elements(p_practice) loop
  if coalesce(a->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or a->>'kind' is null or a->>'kind' not in ('single_choice','multi_select','true_false','scenario','short_answer')
  or jsonb_typeof(a->'options') is distinct from 'array' or jsonb_typeof(a->'answer') is distinct from 'array' or jsonb_typeof(a->'rubric') is distinct from 'array'
  or length(trim(coalesce(a->'prompt'->>'en','')))<15 or length(trim(coalesce(a->'prompt'->>'ar','')))<15
  or length(trim(coalesce(a->'explanation'->>'en','')))<30 or length(trim(coalesce(a->'explanation'->>'ar','')))<30 then raise exception 'Complete bilingual exercises required'; end if;
 end loop;
 perform public.curriculum_backup();
 update public.lesson_activities set retired=true,is_published=false where lesson_id=l.id and not retired;
 for a in select value from jsonb_array_elements(p_practice) loop
  select coalesce(max(version),0)+1 into version_number from public.lesson_activities where lesson_id=l.id and slug=a->>'slug';
  insert into public.lesson_activities(lesson_id,module_id,slug,version,body) values(l.id,l.module_id,a->>'slug',version_number,a);
 end loop;
 update public.lessons set updated_at=clock_timestamp() where id=l.id returning updated_at into touched;
 return jsonb_build_object('updated_at',touched,'exercises',jsonb_array_length(p_practice));
end $$;

create or replace function public.curriculum_reorder(p_kind text,p_ids uuid[]) returns void
language plpgsql security invoker set search_path=public as $$
declare tbl text; parents integer; affected integer;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 tbl:=case p_kind when 'path' then 'learning_paths' when 'module' then 'learning_modules' when 'lesson' then 'lessons' end;
 if tbl is null or cardinality(p_ids)=0 or cardinality(p_ids)<>(select count(distinct x) from unnest(p_ids) x) then raise exception 'Invalid reorder list'; end if;
 if p_kind='module' then select count(distinct learning_path_id) into parents from public.learning_modules where id=any(p_ids);
 elsif p_kind='lesson' then select count(distinct module_id) into parents from public.lessons where id=any(p_ids); end if;
 if parents>1 then raise exception 'Reorder must stay within one parent'; end if;
 execute format('update public.%I t set sort_order=o.ordinality-1 from unnest($1) with ordinality o(id,ordinality) where t.id=o.id',tbl) using p_ids;
 get diagnostics affected=row_count;
 if affected<>cardinality(p_ids) then raise exception 'Reorder includes missing records'; end if;
end $$;

create or replace function public.curriculum_can_read_module(p_module uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select auth.uid() is not null and exists(select 1 from public.learning_modules m join public.learning_paths p on p.id=m.learning_path_id
 where m.id=p_module and m.is_published and m.archived_at is null and p.is_active and p.archived_at is null
 and not exists(select 1 from public.learning_modules prior where prior.learning_path_id=m.learning_path_id and prior.is_published and prior.archived_at is null
 and (prior.sort_order,prior.slug)<(m.sort_order,m.slug)
 and (exists(select 1 from public.lessons l where l.module_id=prior.id and l.archived_at is null and (not l.is_published or not exists(
 select 1 from public.lesson_progress lp where lp.lesson_id=l.id and lp.user_id=auth.uid() and lp.completed_at is not null)))
 or exists(select 1 from public.challenges c where c.module_id=prior.id and c.is_active and c.is_required and not exists(
 select 1 from public.challenge_attempts ca where ca.challenge_id=c.id and ca.user_id=auth.uid() and ca.is_passed=true)))))
$$;
create or replace function public.curriculum_module_completion(p_module uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare total integer; published integer; completed integer;
begin
 if not public.curriculum_can_read_module(p_module) then raise exception 'Module unavailable'; end if;
 select count(*),count(*) filter(where l.is_published),count(*) filter(where l.is_published and lp.completed_at is not null)
 into total,published,completed from public.lessons l left join public.lesson_progress lp on lp.lesson_id=l.id and lp.user_id=auth.uid()
 where l.module_id=p_module and l.archived_at is null;
 return jsonb_build_object('total',total,'published',published,'completed',completed,'ready',total>0 and published=total and completed=total);
end $$;

create or replace function public.curriculum_lesson_navigation(p_lesson uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare current_l public.lessons; result jsonb;
begin
 if not public.curriculum_can_read_lesson(p_lesson) then raise exception 'Lesson unavailable'; end if;
 select * into current_l from public.lessons where id=p_lesson and archived_at is null;
 if not found then raise exception 'Lesson unavailable'; end if;
 with ordered as (select l.id,l.title_en,l.title_ar,l.module_id,m.title_en module_title_en,m.title_ar module_title_ar,
 row_number() over(order by m.sort_order,m.slug,l.sort_order,l.slug) n
 from public.lessons l join public.learning_modules m on m.id=l.module_id
 where l.learning_path_id=current_l.learning_path_id and l.is_published and l.archived_at is null and m.is_published and m.archived_at is null),
 position as (select n from ordered where id=p_lesson)
 select jsonb_build_object('previous',(select to_jsonb(o)-'n' from ordered o,position x where o.n=x.n-1),
 'next',(select (to_jsonb(o)-'n')||jsonb_build_object('available',public.curriculum_can_read_lesson(o.id)) from ordered o,position x where o.n=x.n+1),
 'completed',(select count(*) from ordered o join public.lesson_progress lp on lp.lesson_id=o.id and lp.user_id=auth.uid() and lp.completed_at is not null),
 'total',(select count(*) from ordered),'position',(select n from position)) into result;
 return result;
end $$;

create or replace function public.curriculum_path_status(p_path uuid) returns jsonb
language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'allowed',public.curriculum_can_read_module(m.id),
 'ready',exists(select 1 from public.lessons l where l.module_id=m.id and l.archived_at is null) and not exists(
 select 1 from public.lessons l where l.module_id=m.id and l.archived_at is null and (not l.is_published or not exists(
 select 1 from public.lesson_progress lp where lp.lesson_id=l.id and lp.user_id=auth.uid() and lp.completed_at is not null)))) order by m.sort_order,m.slug),'[]')
 from public.learning_modules m join public.learning_paths p on p.id=m.learning_path_id
 where auth.uid() is not null and p.id=p_path and p.is_active and p.archived_at is null and m.is_published and m.archived_at is null
$$;

-- Guard archives inside security-definer lesson/XP/activity functions too.
create or replace function public.curriculum_can_read_lesson(p_lesson uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.lessons l where l.id=p_lesson and l.is_published and l.archived_at is null and public.curriculum_can_read_module(l.module_id)
 and not exists(select 1 from public.lesson_prerequisites r join public.lessons required on required.id=r.prerequisite_id where r.lesson_id=l.id
 and (not required.is_published or required.archived_at is not null or not exists(select 1 from public.lesson_progress p where p.user_id=auth.uid() and p.lesson_id=r.prerequisite_id and p.completed_at is not null))))
$$;

-- Restore prerequisite-aware educational functions from 031 as well as its table.
-- Existing answer attempts, backups and reward totals remain untouched.
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

revoke all on function public.curriculum_export_json(),public.curriculum_validate_json(jsonb),public.curriculum_prepare_json(jsonb,text,text),public.curriculum_import_json_batch(uuid,integer,integer),public.curriculum_set_state(text,uuid,text),public.curriculum_reorder(text,uuid[]) from public,anon;
grant execute on function public.curriculum_export_json(),public.curriculum_validate_json(jsonb),public.curriculum_prepare_json(jsonb,text,text),public.curriculum_import_json_batch(uuid,integer,integer),public.curriculum_set_state(text,uuid,text),public.curriculum_reorder(text,uuid[]) to authenticated;
revoke all on function public.curriculum_lesson_navigation(uuid) from public,anon;
grant execute on function public.curriculum_lesson_navigation(uuid) to authenticated;
revoke all on function public.curriculum_path_status(uuid) from public,anon;
grant execute on function public.curriculum_path_status(uuid) to authenticated;
revoke all on function public.curriculum_save_practice(uuid,timestamptz,jsonb) from public,anon;
grant execute on function public.curriculum_save_practice(uuid,timestamptz,jsonb) to authenticated;
revoke all on function public.curriculum_can_read_module(uuid),public.curriculum_can_read_lesson(uuid),public.curriculum_module_completion(uuid),public.curriculum_backup(),public.curriculum_get_activities(uuid),public.curriculum_submit_activity(uuid,uuid,jsonb,text),public.curriculum_award_lesson(uuid) from public,anon;
grant execute on function public.curriculum_can_read_module(uuid),public.curriculum_can_read_lesson(uuid),public.curriculum_module_completion(uuid),public.curriculum_backup(),public.curriculum_get_activities(uuid),public.curriculum_submit_activity(uuid,uuid,jsonb,text),public.curriculum_award_lesson(uuid) to authenticated;
commit;
notify pgrst,'reload schema';

-- >>> MIGRATION: 035_legacy_profile_reward_guard.sql <<<
-- Some existing TestCraft databases have this legacy SECURITY DEFINER trigger.
-- Its auth.uid()-only check also rejects updates inside trusted reward RPCs.
-- Use the calling database role while retaining every existing client field guard.
-- No profile, auth, role, progress, or reward records are modified.
begin;
do $migration$
begin
 if to_regprocedure('public.prevent_profile_privilege_escalation()') is not null then
  execute $definition$
   create or replace function public.prevent_profile_privilege_escalation()
   returns trigger language plpgsql security invoker set search_path=public as $guard$
   begin
    if current_user not in ('postgres','service_role','supabase_admin')
      and auth.uid() is not null and not public.is_admin() then
     if new.role is distinct from old.role then raise exception 'You are not allowed to change your role.'; end if;
     if new.total_xp is distinct from old.total_xp then raise exception 'You are not allowed to change your XP.'; end if;
     if new.current_level is distinct from old.current_level then raise exception 'You are not allowed to change your level.'; end if;
     if new.id is distinct from old.id then raise exception 'You are not allowed to change your user id.'; end if;
     if new.created_at is distinct from old.created_at then raise exception 'You are not allowed to change created_at.'; end if;
    end if;
    return new;
   end;
   $guard$;
  $definition$;
 end if;
end;
$migration$;
commit;
notify pgrst,'reload schema';

-- >>> MIGRATION: 20261105114954_curriculum_delete_subtree.sql <<<
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

-- Final schema cache refresh
NOTIFY pgrst, 'reload schema';

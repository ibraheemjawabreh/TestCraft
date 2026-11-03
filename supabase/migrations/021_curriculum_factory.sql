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
  and (exists(select 1 from public.lessons l where l.module_id=prior.id and l.is_published and not exists(
   select 1 from public.lesson_progress lp where lp.lesson_id=l.id and lp.user_id=auth.uid() and lp.completed_at is not null))
  or exists(select 1 from public.challenges c where c.module_id=prior.id and c.is_active and c.is_required and not exists(
   select 1 from public.challenge_attempts ca where ca.challenge_id=c.id and ca.user_id=auth.uid() and (ca.is_passed=true or ca.status::text='approved'))))
 )) $$;

create or replace function public.curriculum_get_activities(p_lesson uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare l public.lessons;
begin
 select * into l from public.lessons where id=p_lesson and is_published;
 if not found or not public.curriculum_can_read_module(l.module_id) then raise exception 'Lesson unavailable'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'version',a.version,'kind',a.body->'kind','prompt',a.body->'prompt','options',a.body->'options','sort_order',a.body->'sort_order','module_assessment',a.lesson_id is null) order by a.lesson_id nulls last,(a.body->>'sort_order')::integer)
 from public.lesson_activities a where a.is_published and not a.retired and
 (a.lesson_id=l.id or (a.module_id=l.module_id and a.lesson_id is null and not exists(
  select 1 from public.lessons after_l where after_l.module_id=l.module_id and after_l.is_published and after_l.sort_order>l.sort_order)))),'[]'::jsonb);
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
 if a.lesson_id is null and exists(select 1 from public.lessons l where l.module_id=a.module_id and l.is_published
  and not exists(select 1 from public.lesson_progress lp where lp.lesson_id=l.id and lp.user_id=auth.uid() and lp.completed_at is not null)) then raise exception 'Complete module lessons first'; end if;
 if jsonb_typeof(p_selected)<>'array' or length(p_text)>5000 then raise exception 'Invalid response'; end if;
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


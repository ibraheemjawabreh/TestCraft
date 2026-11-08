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

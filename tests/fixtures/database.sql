-- Isolated fixture for existing contracts, NOT a production migration.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema public,auth to authenticated,service_role,anon;
create type public.severity_level as enum ('Low','Medium','High','Critical');
create type public.difficulty_level as enum ('Beginner','Intermediate','Advanced');
create table public.profiles(id uuid primary key,role text not null);
insert into profiles values('00000000-0000-4000-8000-000000000001','admin'),
 ('00000000-0000-4000-8000-000000000002','tester'),('00000000-0000-4000-8000-000000000003','tester');
create table public.learning_paths(id uuid primary key default gen_random_uuid(),slug text unique not null,title text,description text,
 title_en text,title_ar text,description_en text,description_ar text,sort_order integer not null,is_active boolean not null,updated_at timestamptz not null default now());
create table public.learning_modules(id uuid primary key default gen_random_uuid(),learning_path_id uuid not null references learning_paths(id),
 slug text,title_en text,title_ar text,description_en text,description_ar text,sort_order integer,is_published boolean not null,
 unique(learning_path_id,slug));
create table public.lessons(id uuid primary key default gen_random_uuid(),learning_path_id uuid not null references learning_paths(id),
 module_id uuid references learning_modules(id),slug text,title text,content text,title_en text,title_ar text,summary_en text,summary_ar text,
 content_en text,content_ar text,objectives_en text[],objectives_ar text[],difficulty difficulty_level,sort_order integer,is_published boolean not null,
 estimated_minutes integer,updated_at timestamptz not null default now(),unique(learning_path_id,slug));
create table public.challenges(id uuid primary key default gen_random_uuid(),slug text,module_id uuid references learning_modules(id),
 lesson_id uuid references lessons(id),learning_path_id uuid references learning_paths(id),is_active boolean,is_required boolean,
 practical_app_key text,practical_app_config jsonb,status text default 'draft');
create table public.hidden_bugs(id uuid primary key default gen_random_uuid(),challenge_id uuid references challenges(id),bug_key text,is_active boolean,description text,bug_title text,actual_severity severity_level,bonus_xp integer);
create table public.challenge_attempts(id uuid primary key default gen_random_uuid(),user_id uuid references profiles(id),challenge_id uuid references challenges(id),status text,is_passed boolean);
create table public.lesson_progress(user_id uuid references profiles(id),lesson_id uuid references lessons(id),completed_at timestamptz,primary key(user_id,lesson_id));
create function public.is_admin() returns boolean language sql stable security definer as $$ select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;
grant select on public.profiles to authenticated;
do $$
declare t text;
begin
 foreach t in array array['learning_paths','learning_modules','lessons','challenges','hidden_bugs'] loop
  execute format('alter table %I enable row level security',t);
  execute format('create policy fixture_admin on %I for all to authenticated using(public.is_admin()) with check(public.is_admin())',t);
  execute format('grant select,insert,update,delete on %I to authenticated',t);
 end loop;
end $$;
create policy hidden_bugs_tester_read_bug_keys on hidden_bugs for select to authenticated using(is_active=true);
grant select,insert,update on lesson_progress,challenge_attempts to authenticated;


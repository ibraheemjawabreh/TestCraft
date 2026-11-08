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
create table public.lesson_progress(user_id uuid references profiles(id),lesson_id uuid references lessons(id),completed_at timestamptz,last_opened_at timestamptz not null default now(),primary key(user_id,lesson_id));
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


-- Existing application reward/report contracts used by integration migrations.
create table public.module_progress(user_id uuid references profiles(id),module_id uuid references learning_modules(id));
create table public.learning_path_progress(user_id uuid references profiles(id),learning_path_id uuid references learning_paths(id));
alter table public.profiles enable row level security;
create policy fixture_profiles_select on profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy fixture_profiles_update on profiles for update to authenticated using(id=auth.uid());
grant update on public.profiles to authenticated;
alter table public.challenges add column base_xp_reward integer not null default 150;
alter table public.challenge_attempts add column xp_awarded boolean not null default false;
alter table public.challenge_attempts add column awarded_xp integer not null default 0;
alter table public.challenge_attempts add column earned_xp integer not null default 0;
alter table public.challenge_attempts add column score integer;
alter table public.challenge_attempts add column admin_feedback text;
alter table public.challenge_attempts add column reviewed_by uuid;
alter table public.challenge_attempts add column reviewed_at timestamptz;
create table public.bug_reports(id uuid primary key default gen_random_uuid(),user_id uuid references profiles(id),
 challenge_id uuid references challenges(id),attempt_id uuid references challenge_attempts(id),title text,
 admin_classification text,status text default 'Pending',admin_score integer,admin_feedback text,reviewed_by uuid,reviewed_at timestamptz);
create table public.xp_transactions(id uuid primary key default gen_random_uuid(),user_id uuid references profiles(id),source_type text,
 source_id uuid,amount integer,reason text,metadata jsonb not null default '{}');
create unique index fixture_lesson_xp_once on public.xp_transactions(user_id,source_id,reason) where reason='lesson_completed';
create unique index fixture_challenge_xp_once on public.xp_transactions(user_id,source_id,reason) where reason='challenge_approved';
create unique index fixture_perfect_once on public.xp_transactions(user_id,source_id,reason) where reason='perfect_challenge';
alter table public.xp_transactions enable row level security;
create policy fixture_xp_select on xp_transactions for select to authenticated using(user_id=auth.uid());
grant select,insert on public.xp_transactions to authenticated;
create table public.badges(id uuid primary key default gen_random_uuid(),badge_key text unique);
insert into badges(badge_key) values('first_lesson_completed'),('first_bug_report'),('first_approved_challenge'),
 ('three_challenges_completed'),('perfect_bug_hunt'),('ten_valid_bug_reports');
create table public.user_badges(user_id uuid references profiles(id),badge_id uuid references badges(id),earned_at timestamptz,primary key(user_id,badge_id));


alter table public.bug_reports add column steps_to_reproduce text;
alter table public.bug_reports add column expected_result text;
alter table public.bug_reports add column actual_result text;
alter table public.bug_reports add column reported_severity text;
alter table public.bug_reports add column matched_hidden_bug_id uuid references hidden_bugs(id);
alter table public.bug_reports add column created_at timestamptz not null default now();
alter table public.challenge_attempts add column created_at timestamptz not null default now();
grant select,insert,update on public.bug_reports to authenticated;
alter table public.bug_reports enable row level security;
create policy fixture_report_own on bug_reports for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy fixture_report_insert on bug_reports for insert to authenticated with check(user_id=auth.uid());
create policy fixture_report_admin on bug_reports for update to authenticated using(public.is_admin()) with check(public.is_admin());
grant select on public.challenge_attempts,public.xp_transactions to service_role;


-- Mirror the existing published-content/owned-attempt read policies.
create policy fixture_paths_public on learning_paths for select to authenticated using(is_active);
create policy fixture_modules_public on learning_modules for select to authenticated using(is_published);
create policy fixture_lessons_public on lessons for select to authenticated using(is_published);
create policy fixture_challenges_public on challenges for select to authenticated using(is_active);
alter table public.challenge_attempts enable row level security;
create policy fixture_attempts_read on challenge_attempts for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy fixture_attempts_insert on challenge_attempts for insert to authenticated with check(user_id=auth.uid() or public.is_admin());
create policy fixture_attempts_update on challenge_attempts for update to authenticated using(user_id=auth.uid() or public.is_admin()) with check(user_id=auth.uid() or public.is_admin());


-- Historical evaluation association retained privately by migration032.
create table public.ai_evaluations(id uuid primary key default gen_random_uuid(),report_id uuid references bug_reports(id),matched_hidden_bug_id uuid references hidden_bugs(id),ai_score integer);
alter table public.ai_evaluations enable row level security;
grant select on public.ai_evaluations to authenticated;
create policy fixture_evaluation_read on public.ai_evaluations for select to authenticated using(public.is_admin() or exists(select 1 from public.bug_reports r where r.id=report_id and r.user_id=auth.uid()));

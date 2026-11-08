-- Isolated copy of the hosted profile contracts used by the account browser tests.
alter table public.profiles alter column username set not null,
  add constraint fixture_unique_username unique(username),
  add column created_at timestamptz default now(), add column updated_at timestamptz default now();

create table auth.users (id uuid primary key, email text unique not null, raw_user_meta_data jsonb not null default '{}');
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000001','fixture1@example.test','{}'),
 ('00000000-0000-4000-8000-000000000002','fixture2@example.test','{"display_name":"Bench Tester"}'),
 ('00000000-0000-4000-8000-000000000003','fixture3@example.test','{}');
update profiles set username='fixture3_000000' where id='00000000-0000-4000-8000-000000000003';
update profiles set username='bench-tester',avatar_url='/favicon.svg' where id='00000000-0000-4000-8000-000000000002';

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
declare base_username text;
begin
  base_username := coalesce(nullif(trim(new.raw_user_meta_data->>'username'),''),
    nullif(trim(new.raw_user_meta_data->>'name'),''),nullif(trim(new.raw_user_meta_data->>'full_name'),''),
    nullif(split_part(new.email,'@',1),''),'Tester');
  insert into public.profiles(id,username,avatar_url,role,total_xp,current_level)
  values (new.id,left(regexp_replace(base_username,'[^a-zA-Z0-9_]','_','g'),32)||'_'||left(new.id::text,6),
    new.raw_user_meta_data->>'avatar_url','tester',0,1)
  on conflict(id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin')
$$;

create function public.fixture_profile_identity_guard() returns trigger language plpgsql set search_path='' as $$
begin
  if current_user='authenticated' and not public.is_admin() and
    (new.id is distinct from old.id or new.role is distinct from old.role or new.created_at is distinct from old.created_at)
  then raise exception 'Protected profile fields'; end if;
  return new;
end $$;
create trigger fixture_profile_identity_guard before update on public.profiles
for each row execute function public.fixture_profile_identity_guard();

alter table public.badges add column description_ar text;
alter table public.bug_reports add column lab_template_id uuid;
grant select on public.bug_reports to authenticated;
update public.bug_reports set reported_severity='Low' where reported_severity is null;
update public.badges set name='First lesson completed', name_ar='إكمال أول درس',
  description='Awarded for finishing your first lesson.', description_ar='تُمنح عند إكمال درسك الأول.'
where badge_key='first_lesson_completed';
update public.badges set name='First bug report', name_ar='أول تقرير خطأ',
  description='Awarded for submitting your first bug report.', description_ar='تُمنح عند إرسال تقرير الخطأ الأول.'
where badge_key='first_bug_report';

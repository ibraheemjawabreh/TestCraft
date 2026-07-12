-- ============================================================
-- TestCraft — 007_challenge_attempts_and_admin_reviews.sql
-- ============================================================

-- ─── 1. Create `challenge_attempts` Table ───────────────────────────────────

create table if not exists public.challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,

  status text not null default 'in_progress',

  started_at timestamptz not null default timezone('utc', now()),
  submitted_at timestamptz,
  reviewed_at timestamptz,

  final_score integer,
  earned_xp integer default 0,
  admin_feedback text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  xp_awarded boolean not null default false,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint challenge_attempts_status_check
    check (status in ('in_progress', 'submitted', 'under_review', 'approved', 'needs_improvement', 'rejected')),

  -- For MVP, one active attempt per user per challenge is enough
  constraint challenge_attempts_user_challenge_key
    unique (user_id, challenge_id)
);

-- ─── 2. Alter `bug_reports` Table ───────────────────────────────────────────

-- Add attempt_id and review fields if missing
alter table public.bug_reports
  add column if not exists attempt_id uuid references public.challenge_attempts(id) on delete set null,
  add column if not exists admin_feedback text,
  add column if not exists admin_score integer,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

-- ─── 3. Backfill Existing Data ──────────────────────────────────────────────

-- Create an attempt for every distinct (user_id, challenge_id) in bug_reports
insert into public.challenge_attempts (user_id, challenge_id, status, started_at, submitted_at, created_at, updated_at)
select distinct
  user_id,
  challenge_id,
  'submitted' as status, -- Assume submitted if there's a bug report
  min(created_at) over (partition by user_id, challenge_id) as started_at,
  max(created_at) over (partition by user_id, challenge_id) as submitted_at,
  min(created_at) over (partition by user_id, challenge_id) as created_at,
  max(created_at) over (partition by user_id, challenge_id) as updated_at
from public.bug_reports
where user_id is not null and challenge_id is not null
on conflict (user_id, challenge_id) do update
  set status = excluded.status,
      submitted_at = excluded.submitted_at;

-- Link existing bug reports to the created attempts
update public.bug_reports br
set attempt_id = ca.id
from public.challenge_attempts ca
where br.user_id = ca.user_id
  and br.challenge_id = ca.challenge_id
  and br.attempt_id is null;

-- ─── 4. Triggers ─────────────────────────────────────────────────────────────

-- Trigger for `updated_at` on challenge_attempts
drop trigger if exists set_challenge_attempts_updated_at on public.challenge_attempts;

create trigger set_challenge_attempts_updated_at
  before update on public.challenge_attempts
  for each row
  execute function public.set_updated_at();

-- Trigger to protect review fields from being altered by non-admins
create or replace function public.protect_challenge_attempt_review_fields()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_role text;
begin
  -- Only check if the user is a tester trying to modify admin fields
  select role into v_role from public.profiles where id = auth.uid();
  
  if v_role = 'tester' then
    if new.final_score is distinct from old.final_score then
      raise exception 'Testers cannot update final_score';
    end if;
    if new.earned_xp is distinct from old.earned_xp then
      raise exception 'Testers cannot update earned_xp';
    end if;
    if new.admin_feedback is distinct from old.admin_feedback then
      raise exception 'Testers cannot update admin_feedback';
    end if;
    if new.reviewed_by is distinct from old.reviewed_by then
      raise exception 'Testers cannot update reviewed_by';
    end if;
    if new.reviewed_at is distinct from old.reviewed_at then
      raise exception 'Testers cannot update reviewed_at';
    end if;
    if new.xp_awarded is distinct from old.xp_awarded then
      raise exception 'Testers cannot update xp_awarded';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists a_protect_challenge_attempt_review_fields on public.challenge_attempts;

create trigger a_protect_challenge_attempt_review_fields
  before update on public.challenge_attempts
  for each row
  execute function public.protect_challenge_attempt_review_fields();


-- ─── 5. Row Level Security ──────────────────────────────────────────────────

alter table public.challenge_attempts enable row level security;

-- Testers can select their own attempts
create policy "challenge_attempts_select_own"
  on public.challenge_attempts
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Admins can select all attempts
create policy "challenge_attempts_select_all_admin"
  on public.challenge_attempts
  for select
  to authenticated
  using (public.is_admin());

-- Testers can insert their own attempts
create policy "challenge_attempts_insert_own"
  on public.challenge_attempts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Testers can update their own attempts (review fields protected by trigger)
create policy "challenge_attempts_update_own"
  on public.challenge_attempts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admins can update all attempts
create policy "challenge_attempts_update_all_admin"
  on public.challenge_attempts
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admins can view all bug_reports (in case it wasn't already added)
drop policy if exists "bug_reports_select_all_admin" on public.bug_reports;
create policy "bug_reports_select_all_admin"
  on public.bug_reports
  for select
  to authenticated
  using (public.is_admin());

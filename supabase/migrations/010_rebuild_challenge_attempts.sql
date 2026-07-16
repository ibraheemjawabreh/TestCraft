-- ============================================================
-- TestCraft — 010_rebuild_challenge_attempts.sql
-- Rebuilds challenge_attempts with the canonical schema.
-- Enum: started | submitted | reviewing | approved | rejected
-- ============================================================

-- ─── 1. Drop old objects that depend on challenge_attempts ───────────────────

-- Drop triggers
drop trigger if exists set_challenge_attempts_updated_at on public.challenge_attempts;
drop trigger if exists a_protect_challenge_attempt_review_fields on public.challenge_attempts;

-- Drop functions
drop function if exists public.protect_challenge_attempt_review_fields();

-- Drop old RLS policies
drop policy if exists "challenge_attempts_select_own" on public.challenge_attempts;
drop policy if exists "challenge_attempts_select_all_admin" on public.challenge_attempts;
drop policy if exists "challenge_attempts_insert_own" on public.challenge_attempts;
drop policy if exists "challenge_attempts_update_own" on public.challenge_attempts;
drop policy if exists "challenge_attempts_update_all_admin" on public.challenge_attempts;

-- ─── 2. Migrate existing data to preserve bug_report links ───────────────────

-- Temporarily allow nulls for attempt_id during migration
-- (bug_reports.attempt_id is already nullable from migration 007)

-- ─── 3. Drop and recreate challenge_attempts table ───────────────────────────

-- Nullify bug_reports.attempt_id FK before dropping (on delete set null handles this)
-- The FK is "on delete set null" so dropping the table automatically NULLs bug_reports.attempt_id

drop table if exists public.challenge_attempts cascade;

-- ─── 4. Create `attempt_status` type ────────────────────────────────────────

-- Use text with check constraint (avoids enum migration pain in Postgres)
-- Values: started | submitted | reviewing | approved | rejected

-- ─── 5. Create canonical `challenge_attempts` table ─────────────────────────

create table public.challenge_attempts (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null references public.profiles(id) on delete cascade,
  challenge_id         uuid        not null references public.challenges(id) on delete cascade,

  -- Status lifecycle: started → submitted → reviewing → approved | rejected
  status               text        not null default 'started',

  started_at           timestamptz not null default now(),
  submitted_at         timestamptz,
  review_started_at    timestamptz,
  reviewed_at          timestamptz,
  reviewed_by          uuid        references public.profiles(id) on delete set null,

  -- Review outcome fields (admin only)
  score                integer     check (score is null or (score >= 0 and score <= 100)),
  earned_xp            integer     default 0,
  admin_feedback       text,
  time_spent_seconds   integer,
  is_passed            boolean,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint challenge_attempts_status_check
    check (status in ('started', 'submitted', 'reviewing', 'approved', 'rejected')),

  -- A user may have multiple attempts per challenge (retries after rejection)
  -- No unique constraint — sequential learning allows retries
  -- But only ONE active attempt (started/submitted/reviewing) is enforced by trigger below
  constraint challenge_attempts_score_range
    check (score is null or (score >= 0 and score <= 100))
);

-- ─── 6. Indexes ──────────────────────────────────────────────────────────────

create index idx_challenge_attempts_user_id       on public.challenge_attempts(user_id);
create index idx_challenge_attempts_challenge_id  on public.challenge_attempts(challenge_id);
create index idx_challenge_attempts_status        on public.challenge_attempts(status);
create index idx_challenge_attempts_submitted_at  on public.challenge_attempts(submitted_at desc nulls last);
create index idx_challenge_attempts_user_challenge on public.challenge_attempts(user_id, challenge_id);

-- ─── 7. Restore bug_reports.attempt_id FK ────────────────────────────────────

-- Re-add the FK (it was dropped by cascade when we dropped the table)
alter table public.bug_reports
  add column if not exists attempt_id uuid references public.challenge_attempts(id) on delete set null;

-- ─── 8. Updated_at trigger ───────────────────────────────────────────────────

create trigger set_challenge_attempts_updated_at
  before update on public.challenge_attempts
  for each row
  execute function public.set_updated_at();

-- ─── 9. Enforce: only one active attempt per user per challenge ───────────────

create or replace function public.enforce_single_active_attempt()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  -- On INSERT, check there's no existing active attempt for this user+challenge
  if tg_op = 'INSERT' then
    if exists (
      select 1
      from public.challenge_attempts
      where user_id = new.user_id
        and challenge_id = new.challenge_id
        and status in ('started', 'submitted', 'reviewing')
    ) then
      raise exception
        'An active attempt already exists for this user and challenge. Complete or withdraw the existing attempt first.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_single_active_attempt
  before insert on public.challenge_attempts
  for each row
  execute function public.enforce_single_active_attempt();

-- ─── 10. Protect review fields from tester modification ──────────────────────

create or replace function public.protect_challenge_attempt_review_fields()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();

  if v_role = 'tester' then
    -- Testers cannot touch any admin review fields
    if new.score is distinct from old.score then
      raise exception 'Testers cannot update score' using errcode = 'P0002';
    end if;
    if new.earned_xp is distinct from old.earned_xp then
      raise exception 'Testers cannot update earned_xp' using errcode = 'P0002';
    end if;
    if new.admin_feedback is distinct from old.admin_feedback then
      raise exception 'Testers cannot update admin_feedback' using errcode = 'P0002';
    end if;
    if new.reviewed_by is distinct from old.reviewed_by then
      raise exception 'Testers cannot update reviewed_by' using errcode = 'P0002';
    end if;
    if new.reviewed_at is distinct from old.reviewed_at then
      raise exception 'Testers cannot update reviewed_at' using errcode = 'P0002';
    end if;
    if new.review_started_at is distinct from old.review_started_at then
      raise exception 'Testers cannot update review_started_at' using errcode = 'P0002';
    end if;
    if new.is_passed is distinct from old.is_passed then
      raise exception 'Testers cannot update is_passed' using errcode = 'P0002';
    end if;
    -- Testers cannot edit approved or rejected attempts at all
    if old.status in ('approved', 'rejected') then
      raise exception 'Approved or rejected attempts are read-only for testers' using errcode = 'P0003';
    end if;
  end if;

  return new;
end;
$$;

create trigger protect_challenge_attempt_review_fields
  before update on public.challenge_attempts
  for each row
  execute function public.protect_challenge_attempt_review_fields();

-- ─── 11. Row Level Security ───────────────────────────────────────────────────

alter table public.challenge_attempts enable row level security;

-- Testers: select only their own attempts
create policy "challenge_attempts_tester_select"
  on public.challenge_attempts
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Admins: select all attempts
create policy "challenge_attempts_admin_select"
  on public.challenge_attempts
  for select
  to authenticated
  using (public.is_admin());

-- Testers: insert only their own attempts
create policy "challenge_attempts_tester_insert"
  on public.challenge_attempts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Testers: update only their own non-terminal attempts
-- (review-field protection handled by trigger)
create policy "challenge_attempts_tester_update"
  on public.challenge_attempts
  for update
  to authenticated
  using (auth.uid() = user_id and status not in ('approved', 'rejected'))
  with check (auth.uid() = user_id);

-- Admins: update all attempts (for review)
create policy "challenge_attempts_admin_update"
  on public.challenge_attempts
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── 12. Bug reports admin select policy (idempotent) ────────────────────────

drop policy if exists "bug_reports_select_all_admin" on public.bug_reports;
create policy "bug_reports_select_all_admin"
  on public.bug_reports
  for select
  to authenticated
  using (public.is_admin());

-- ============================================================
-- TestCraft — 001_create_profiles.sql
-- Run this inside the Supabase SQL Editor (Dashboard → SQL Editor)
-- or via the Supabase CLI: supabase db push
-- ============================================================
-- This migration is idempotent — safe to re-run.
-- ============================================================

-- ─── 1. Profiles Table ──────────────────────────────────────────────────────

create table if not exists public.profiles (
  id                   uuid          primary key references auth.users(id) on delete cascade,
  full_name            text          not null,
  email                text,
  avatar_url           text,
  role                 text          not null default 'student',
  level                integer       not null default 1,
  xp                   integer       not null default 0,
  onboarding_completed boolean       not null default false,
  created_at           timestamptz   not null default now(),
  updated_at           timestamptz   not null default now(),
  last_login_at        timestamptz,

  -- full_name must be 2–80 non-blank characters (trim applied in trigger)
  constraint profiles_full_name_length
    check (char_length(trim(full_name)) between 2 and 80),

  -- role is an enum-like text constraint — never trust the client to set this
  constraint profiles_role_values
    check (role in ('student', 'company', 'admin')),

  -- level starts at 1 and never goes below it
  constraint profiles_level_positive
    check (level >= 1),

  -- xp is non-negative
  constraint profiles_xp_non_negative
    check (xp >= 0)
);

-- ─── 2. Row Level Security ──────────────────────────────────────────────────

alter table public.profiles enable row level security;

-- Policy: authenticated users may read ONLY their own row
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- Policy: authenticated users may update their own row
-- Column-level restrictions (role, xp, level, id, created_at) are enforced
-- by the protect_profile_immutable_fields trigger below.
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ⚠️  No INSERT policy for authenticated or anon.
--     Profile creation happens exclusively via the on_auth_user_created trigger
--     (security definer), which bypasses RLS.

-- ─── 3. Trigger: auto-update `updated_at` ──────────────────────────────────

create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- ─── 4. Trigger: protect immutable / privileged fields ─────────────────────
-- Runs BEFORE the set_updated_at trigger (alphabetically earlier name) so
-- invalid updates are rejected before any other modification occurs.

create or replace function public.protect_profile_immutable_fields()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'profiles.id is immutable';
  end if;

  if new.role <> old.role then
    raise exception 'profiles.role cannot be changed by users';
  end if;

  if new.xp <> old.xp then
    raise exception 'profiles.xp can only be updated by the system';
  end if;

  if new.level <> old.level then
    raise exception 'profiles.level can only be updated by the system';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'profiles.created_at is immutable';
  end if;

  return new;
end;
$$;

drop trigger if exists a_protect_profile_immutable_fields on public.profiles;

-- Trigger name starts with 'a_' so it fires before 'set_profiles_updated_at'
create trigger a_protect_profile_immutable_fields
  before update on public.profiles
  for each row
  execute function public.protect_profile_immutable_fields();

-- ─── 5. Trigger: create profile when a new auth user signs up ───────────────
-- This is the ONLY mechanism that inserts rows into public.profiles.
-- It runs as security definer (owner privileges) and bypasses RLS.
-- The function is idempotent: ON CONFLICT DO NOTHING prevents duplicate rows.

create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_full_name  text;
  v_avatar_url text;
begin
  -- Prefer explicit full_name metadata (sent during email sign-up).
  -- Fall back to Google's 'name' field, then to the email prefix.
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'),      ''),
    split_part(coalesce(new.email, 'user@example.com'), '@', 1)
  );

  -- Enforce constraint bounds safely inside the trigger
  v_full_name := left(trim(v_full_name), 80);
  if char_length(v_full_name) < 2 then
    v_full_name := 'User';
  end if;

  -- Google OAuth sends avatar_url; some providers send 'picture'
  v_avatar_url := coalesce(
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
    nullif(trim(new.raw_user_meta_data->>'picture'),    '')
  );

  insert into public.profiles (
    id,
    full_name,
    email,
    avatar_url,
    role,
    level,
    xp,
    onboarding_completed
  ) values (
    new.id,
    v_full_name,
    new.email,
    v_avatar_url,
    'student',   -- role is always 'student' at creation — never trusted from client
    1,
    0,
    false
  )
  on conflict (id) do nothing; -- Safe if the trigger fires more than once

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ─── 6. Revoke unsafe permissions ───────────────────────────────────────────
-- The 'authenticated' role receives only SELECT and UPDATE.
-- INSERT is blocked at the grant level (defense in depth; RLS also blocks it).
-- DELETE is not needed by users — cascade handles it via auth.users FK.

revoke insert, delete on public.profiles from authenticated;
revoke all              on public.profiles from anon;

-- Re-grant only what users need
grant select, update on public.profiles to authenticated;

-- ─── Done ───────────────────────────────────────────────────────────────────
-- After running this migration, verify in Supabase Dashboard:
--   Table Editor → profiles → RLS is ON
--   Auth → Providers → Google is configured (for Google OAuth)
-- ─────────────────────────────────────────────────────────────────────────────

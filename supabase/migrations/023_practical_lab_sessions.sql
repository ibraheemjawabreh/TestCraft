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


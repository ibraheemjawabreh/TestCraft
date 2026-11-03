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


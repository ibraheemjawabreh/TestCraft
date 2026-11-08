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

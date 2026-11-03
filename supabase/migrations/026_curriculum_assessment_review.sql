begin;
create or replace function public.curriculum_stage_assessment(p_module uuid,p_activities jsonb) returns integer
language plpgsql security invoker set search_path=public as $$
declare a jsonb; n integer;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 perform 1 from public.learning_modules where id=p_module for update;
 if not found then raise exception 'Module not found'; end if;
 perform public.curriculum_backup();
 for a in select value from jsonb_array_elements(p_activities) loop
  select coalesce(max(version),0)+1 into n from public.lesson_activities where module_id=p_module and lesson_id is null and slug=a->>'slug';
  insert into public.lesson_activities(module_id,slug,version,body) values(p_module,a->>'slug',n,a);
 end loop;
 return jsonb_array_length(p_activities);
end $$;
revoke all on function public.curriculum_stage_assessment(uuid,jsonb) from public,anon;
grant execute on function public.curriculum_stage_assessment(uuid,jsonb) to authenticated;
create or replace function public.curriculum_check_challenge_links() returns trigger language plpgsql set search_path=public as $$
begin
 if new.module_id is not null and new.learning_path_id is not null and
 not exists(select 1 from public.learning_modules where id=new.module_id and learning_path_id=new.learning_path_id) then raise exception 'Challenge module/path mismatch'; end if;
 if new.lesson_id is not null and new.module_id is not null and
 not exists(select 1 from public.lessons where id=new.lesson_id and module_id=new.module_id) then raise exception 'Challenge lesson/module mismatch'; end if;
 return new;
end $$;
create trigger curriculum_challenge_links before insert or update of module_id,learning_path_id,lesson_id on public.challenges
 for each row execute function public.curriculum_check_challenge_links();
commit;
notify pgrst,'reload schema';


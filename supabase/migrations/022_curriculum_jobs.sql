begin;
grant select,insert,update on public.curriculum_backups,public.curriculum_sources,public.curriculum_versions,
 public.lesson_activities,public.curriculum_jobs,public.curriculum_job_items to authenticated;
grant select,update on public.activity_attempts to authenticated;

create or replace function public.curriculum_start_job(p_source uuid,p_manifest jsonb,p_specs jsonb,p_requests integer,p_cost numeric,p_config jsonb,p_regenerate boolean default false)
returns uuid language plpgsql security invoker set search_path=public as $$
declare jid uuid; spec jsonb; lid uuid; run_key text; skip_item boolean;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 if jsonb_array_length(p_specs)=0 then raise exception 'No selected lessons'; end if;
 run_key:=md5(p_source::text||p_specs::text||p_requests::text||p_cost::text||p_config::text||p_regenerate::text);
 perform pg_advisory_xact_lock(hashtext(run_key));
 select id into jid from public.curriculum_jobs where status in ('queued','running','paused') and provider_config->>'run_key'=run_key limit 1;
 if jid is not null then return jid; end if;
 insert into public.curriculum_jobs(source_id,created_by,manifest,max_requests,max_cost_usd,provider_config)
 values(p_source,auth.uid(),p_manifest,p_requests,p_cost,p_config||jsonb_build_object('run_key',run_key)) returning id into jid;
 for spec in select value from jsonb_array_elements(p_specs) loop
  select l.id into lid from public.lessons l join public.learning_paths p on p.id=l.learning_path_id
  join public.learning_modules m on m.id=l.module_id
  where p.slug=spec->>'path_slug' and m.slug=spec->>'module_slug' and l.slug=spec->>'lesson_slug';
  if lid is null then raise exception 'Import manifest before starting generation'; end if;
  skip_item:=not p_regenerate and (exists(select 1 from public.curriculum_versions where lesson_id=lid and status in ('applied','approved','needs_review'))
   or exists(select 1 from public.lessons where id=lid and (is_published or length(coalesce(content_en,''))>=2200)));
  insert into public.curriculum_job_items(job_id,lesson_key,spec,status)
  values(jid,spec->>'key',spec,case when skip_item then 'skipped' else 'queued' end);
 end loop;
 return jid;
end $$;

create or replace function public.curriculum_finish(p_item uuid,p_token uuid,p_output jsonb,p_error text,p_retry boolean,p_actual_cost numeric)
returns void language plpgsql security invoker set search_path=public as $$
declare item public.curriculum_job_items; d jsonb; l public.lessons; a jsonb; n integer;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 -- Lock job before item, matching claim lock order.
 perform 1 from public.curriculum_jobs where id=(select job_id from public.curriculum_job_items where id=p_item) for update;
 select * into item from public.curriculum_job_items where id=p_item for update;
 if not found or item.status<>'running' or item.claim_token<>p_token then raise exception 'Stale worker lease'; end if;
 update public.curriculum_jobs set actual_cost_usd=actual_cost_usd+greatest(coalesce(p_actual_cost,0),0),updated_at=now() where id=item.job_id;
 if p_error is not null then
  update public.curriculum_job_items set status='failed',error=left(p_error,500),
   attempts=case when p_retry then attempts else 3 end,
   next_attempt_at=now()+make_interval(secs=>power(2,attempts)::integer*2) where id=item.id;
  return;
 end if;
 d:=p_output->'lesson';
 if d->>'key'<>item.lesson_key or (d->>'is_published')::boolean is distinct from false then raise exception 'Invalid generated lesson identity'; end if;
 select ls.* into l from public.lessons ls join public.learning_paths p on p.id=ls.learning_path_id
 join public.learning_modules m on m.id=ls.module_id
 where p.slug=item.spec->>'path_slug' and m.slug=item.spec->>'module_slug' and ls.slug=item.spec->>'lesson_slug';
 perform public.curriculum_backup();
 insert into public.curriculum_versions(lesson_id,fingerprint,body,base_updated_at,created_by)
 values(l.id,md5(d::text),d,l.updated_at,auth.uid()) on conflict do nothing;
 -- Generation stages a revision; it never silently applies a changed lesson.
 if jsonb_array_length(coalesce(p_output->'module_assessment','[]'))>0 then
  for a in select value from jsonb_array_elements(p_output->'module_assessment') loop
   select coalesce(max(version),0)+1 into n from public.lesson_activities where module_id=l.module_id and lesson_id is null and slug=a->>'slug';
   insert into public.lesson_activities(module_id,slug,version,body) values(l.module_id,a->>'slug',n,a);
  end loop;
 end if;
 update public.curriculum_job_items set status='completed',output=p_output,error=null where id=item.id;
end $$;
revoke all on function public.curriculum_start_job(uuid,jsonb,jsonb,integer,numeric,jsonb,boolean),public.curriculum_finish(uuid,uuid,jsonb,text,boolean,numeric) from public,anon;
grant execute on function public.curriculum_start_job(uuid,jsonb,jsonb,integer,numeric,jsonb,boolean),public.curriculum_finish(uuid,uuid,jsonb,text,boolean,numeric) to authenticated;
commit;
notify pgrst,'reload schema';


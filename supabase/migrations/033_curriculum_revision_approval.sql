begin;

create or replace function public.curriculum_approve_version(p_version uuid) returns uuid
language plpgsql security invoker set search_path=public as $$
declare v public.curriculum_versions; l public.lessons;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 select * into v from public.curriculum_versions where id=p_version for update;
 if not found or v.status<>'needs_review' then raise exception 'Revision must be awaiting review'; end if;
 select * into l from public.lessons where id=v.lesson_id for update;
 if not found or l.is_published then raise exception 'Only unpublished lessons can receive an approved revision'; end if;
 perform public.curriculum_backup();
 update public.curriculum_versions set status='approved' where id=v.id;
 return v.id;
end $$;

create or replace function public.curriculum_apply_version(p_version uuid,p_expected_updated timestamptz) returns uuid
language plpgsql security invoker set search_path=public as $$
declare v public.curriculum_versions; l public.lessons; a jsonb; n integer;
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 select * into v from public.curriculum_versions where id=p_version for update;
 if not found or v.status<>'approved' then raise exception 'Revision must be explicitly approved first'; end if;
 select * into l from public.lessons where id=v.lesson_id for update;
 if l.is_published then raise exception 'Unpublish explicitly before applying a revision'; end if;
 if l.updated_at<>p_expected_updated or v.base_updated_at<>p_expected_updated then raise exception 'Lesson changed; regenerate or review a fresh revision'; end if;
 perform public.curriculum_backup();
 update public.lessons set content=v.body->>'content_en',content_en=v.body->>'content_en',content_ar=v.body->>'content_ar',
 summary_en=v.body->>'summary_en',summary_ar=v.body->>'summary_ar',title_en=v.body->>'title_en',title_ar=v.body->>'title_ar',
 objectives_en=array(select jsonb_array_elements_text(v.body->'objectives_en')),
 objectives_ar=array(select jsonb_array_elements_text(v.body->'objectives_ar')),
 estimated_minutes=(v.body->>'estimated_minutes')::integer,updated_at=now() where id=l.id;
 update public.lesson_activities set retired=true,is_published=false where lesson_id=l.id;
 for a in select value from jsonb_array_elements(v.body->'activities') loop
  select coalesce(max(version),0)+1 into n from public.lesson_activities where lesson_id=l.id and slug=a->>'slug';
  insert into public.lesson_activities(lesson_id,module_id,slug,version,body) values(l.id,l.module_id,a->>'slug',n,a);
 end loop;
 update public.curriculum_versions set status='applied' where id=v.id;
 return l.id;
end $$;

revoke all on function public.curriculum_approve_version(uuid) from public,anon;
grant execute on function public.curriculum_approve_version(uuid) to authenticated;
commit;
notify pgrst,'reload schema';

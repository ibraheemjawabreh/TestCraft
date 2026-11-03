begin;
create or replace function public.curriculum_can_read_module(p_module uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select auth.uid() is not null and exists(
 select 1 from public.learning_modules m join public.learning_paths p on p.id=m.learning_path_id
 where m.id=p_module and m.is_published and p.is_active
 and not exists(
  select 1 from public.learning_modules prior where prior.learning_path_id=m.learning_path_id and prior.is_published and prior.sort_order<m.sort_order
  and (exists(select 1 from public.lessons l where l.module_id=prior.id and (not l.is_published or not exists(
   select 1 from public.lesson_progress lp where lp.lesson_id=l.id and lp.user_id=auth.uid() and lp.completed_at is not null)))
  or exists(select 1 from public.challenges c where c.module_id=prior.id and c.is_active and c.is_required and not exists(
   select 1 from public.challenge_attempts ca where ca.challenge_id=c.id and ca.user_id=auth.uid() and ca.is_passed=true)))
 )) $$;

create or replace function public.curriculum_get_activities(p_lesson uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare l public.lessons;
begin
 select * into l from public.lessons where id=p_lesson and is_published;
 if not found or not public.curriculum_can_read_module(l.module_id) then raise exception 'Lesson unavailable'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'version',a.version,'kind',a.body->'kind','prompt',a.body->'prompt','options',a.body->'options','sort_order',a.body->'sort_order','module_assessment',a.lesson_id is null) order by a.lesson_id nulls last,(a.body->>'sort_order')::integer)
 from public.lesson_activities a where a.is_published and not a.retired and
 (a.lesson_id=l.id or (a.module_id=l.module_id and a.lesson_id is null and not exists(select 1 from public.lessons pending where pending.module_id=l.module_id and not pending.is_published) and not exists(
  select 1 from public.lessons after_l where after_l.module_id=l.module_id and after_l.sort_order>l.sort_order)))),'[]'::jsonb);
end $$;

create or replace function public.curriculum_submit_activity(p_activity uuid,p_request uuid,p_selected jsonb,p_text text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.lesson_activities; prior public.activity_attempts; attempt_id uuid; st text; result_score integer; feedback jsonb; cnt integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 -- Same request ID is idempotent across network retries.
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text||p_request::text));
 select * into prior from public.activity_attempts where user_id=auth.uid() and request_id=p_request;
 if found then
  if prior.activity_id<>p_activity then raise exception 'Request ID already used'; end if;
  return jsonb_build_object('id',prior.id,'status',prior.status,'score',prior.score,'feedback',prior.feedback);
 end if;
 select * into a from public.lesson_activities where id=p_activity and is_published and not retired;
 if not found or not public.curriculum_can_read_module(a.module_id) then raise exception 'Activity unavailable'; end if;
 if a.lesson_id is not null and not exists(select 1 from public.lessons where id=a.lesson_id and is_published) then raise exception 'Lesson unavailable'; end if;
 if a.lesson_id is null and exists(select 1 from public.lessons l where l.module_id=a.module_id and (not l.is_published
  or not exists(select 1 from public.lesson_progress lp where lp.lesson_id=l.id and lp.user_id=auth.uid() and lp.completed_at is not null))) then raise exception 'Complete module lessons first'; end if;
 if jsonb_typeof(p_selected) is distinct from 'array' or p_text is null or length(p_text)>5000 then raise exception 'Invalid response'; end if;
 cnt:=jsonb_array_length(p_selected);
 if a.body->>'kind'='short_answer' then
  if cnt<>0 or length(trim(p_text))<20 then raise exception 'Write at least 20 characters'; end if;
  st:='needs_review'; result_score:=null; feedback:=jsonb_build_object('rubric',a.body->'rubric');
 else
  if p_text<>'' or cnt=0 or cnt>(jsonb_array_length(a.body->'options')) or
    (a.body->>'kind'<>'multi_select' and cnt<>1) or
    (select count(distinct value) from jsonb_array_elements_text(p_selected))<>cnt or
    exists(select 1 from jsonb_array_elements_text(p_selected) s where not exists(select 1 from jsonb_array_elements(a.body->'options') o where o->>'id'=s.value))
   then raise exception 'Invalid selected options'; end if;
  st:='graded';
  result_score:=case when p_selected @> (a.body->'answer') and (a.body->'answer') @> p_selected then 1 else 0 end;
  feedback:=jsonb_build_object('explanation',a.body->'explanation');
 end if;
 insert into public.activity_attempts(activity_id,user_id,request_id,response,status,score,feedback)
 values(a.id,auth.uid(),p_request,jsonb_build_object('selected',p_selected,'text',p_text),st,result_score,feedback) returning id into attempt_id;
 -- Formative checks award no XP. Existing lesson/challenge XP remains authoritative.
 return jsonb_build_object('id',attempt_id,'status',st,'score',result_score,'feedback',feedback);
end $$;

create or replace function public.curriculum_can_enter_lab(p_challenge uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.challenges c where c.id=p_challenge and c.is_active and c.status='published'
 and public.curriculum_can_read_module(c.module_id)
 and exists(select 1 from public.lessons l where l.module_id=c.module_id)
 and not exists(select 1 from public.lessons l where l.module_id=c.module_id and
  (not l.is_published or not exists(select 1 from public.lesson_progress p where p.lesson_id=l.id and p.user_id=auth.uid() and p.completed_at is not null))))
$$;
revoke all on function public.curriculum_can_enter_lab(uuid) from public,anon;
grant execute on function public.curriculum_can_enter_lab(uuid) to authenticated;
commit;
notify pgrst,'reload schema';

-- Phase 2. Review before deploying. Read-only RPCs; no data or RLS policy changes.
begin;

create schema if not exists testcraft_catalog_private;
revoke all on schema testcraft_catalog_private from public, anon, authenticated;
grant usage on schema testcraft_catalog_private to anon, authenticated;

-- This is the deliberate public projection, in a schema not exposed by the
-- Data API. Keep this field allowlist independent of the curriculum row shape.
create or replace function testcraft_catalog_private.learning_catalog(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  with paths as (
    select id, slug, sort_order, title, title_en, title_ar, description, description_en, description_ar
    from public.learning_paths
    where is_active and archived_at is null and (p_slug is null or slug = p_slug)
  ), modules as (
    select m.id, m.learning_path_id, m.slug, m.sort_order, m.title_en, m.title_ar, m.description_en, m.description_ar
    from public.learning_modules m join paths p on p.id = m.learning_path_id
    where m.is_published and m.archived_at is null
  ), lessons as (
    select l.id, l.learning_path_id, l.module_id, l.slug, l.sort_order,
           l.title, l.title_en, l.title_ar, l.estimated_minutes
    from public.lessons l join modules m on m.id = l.module_id and m.learning_path_id = l.learning_path_id
    where l.is_published and l.archived_at is null
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'slug', p.slug,
    'title', p.title, 'title_en', p.title_en, 'title_ar', p.title_ar,
    'description', p.description, 'description_en', p.description_en, 'description_ar', p.description_ar,
    'module_count', (select count(*) from modules m where m.learning_path_id = p.id),
    'lesson_count', (select count(*) from lessons l where l.learning_path_id = p.id),
    'modules', case when p_slug is null then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'title_en', m.title_en, 'title_ar', m.title_ar,
        'description_en', m.description_en, 'description_ar', m.description_ar,
        'lessons', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', l.id, 'title', l.title, 'title_en', l.title_en, 'title_ar', l.title_ar,
            'estimated_minutes', l.estimated_minutes
          ) order by l.sort_order, l.slug, l.id)
          from lessons l where l.module_id = m.id
        ), '[]'::jsonb)
      ) order by m.sort_order, m.slug, m.id)
      from modules m where m.learning_path_id = p.id
    ), '[]'::jsonb) end
  ) order by p.sort_order, p.slug, p.id), '[]'::jsonb)
  from paths p;
$$;

create or replace function public.curriculum_public_catalog(p_slug text default null)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select testcraft_catalog_private.learning_catalog(p_slug);
$$;

revoke all on function testcraft_catalog_private.learning_catalog(text) from public, anon, authenticated;
revoke all on function public.curriculum_public_catalog(text) from public, anon, authenticated;
grant execute on function testcraft_catalog_private.learning_catalog(text) to anon, authenticated;
grant execute on function public.curriculum_public_catalog(text) to anon, authenticated;

-- Personal state remains under caller RLS. Existing authoritative module and
-- lesson gates decide eligibility; this function only returns IDs and state.
create or replace function public.curriculum_path_study(p_slug text default null)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with outline as materialized (
    select l.id, p.id as path_id, p.sort_order as path_order, p.slug as path_slug,
           m.sort_order as module_order, m.slug as module_slug,
           l.sort_order as lesson_order, l.slug as lesson_slug,
           lp.lesson_id is not null as started, lp.completed_at, lp.last_opened_at
    from public.learning_paths p
    join public.learning_modules m on m.learning_path_id = p.id
    join public.lessons l on l.module_id = m.id and l.learning_path_id = p.id
    left join public.lesson_progress lp on lp.lesson_id = l.id and lp.user_id = (select auth.uid())
    where (select auth.uid()) is not null
      and p.is_active and p.archived_at is null and (p_slug is null or p.slug = p_slug)
      and m.is_published and m.archived_at is null
      and l.is_published and l.archived_at is null
  ), recent as (
    select path_id from outline where started order by last_opened_at desc nulls last, id limit 1
  ), eligible as materialized (
    select * from outline
    where (p_slug is not null or completed_at is null) and public.curriculum_can_read_lesson(id)
  ), resume as (
    select id from eligible where completed_at is null
    order by started desc, last_opened_at desc nulls last,
      case when path_id = (select path_id from recent) then 0 else 1 end,
      path_order, path_slug, module_order, module_slug, lesson_order, lesson_slug, id
    limit 1
  )
  select jsonb_build_object(
    'lesson_id', (select id from resume),
    'started', exists(select 1 from outline where started),
    'completed', case when p_slug is not null then coalesce(
      (select jsonb_agg(id) from outline where completed_at is not null), '[]'::jsonb) else '[]'::jsonb end,
    'available', case when p_slug is not null then coalesce(
      (select jsonb_agg(id) from eligible), '[]'::jsonb) else '[]'::jsonb end
  );
$$;
revoke all on function public.curriculum_path_study(text) from public, anon, authenticated;
grant execute on function public.curriculum_path_study(text) to authenticated;

commit;
notify pgrst, 'reload schema';

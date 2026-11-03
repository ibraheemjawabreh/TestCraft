begin;
-- RLS protects rows, not columns. Historical reward/report records retain their
-- private bug associations, but the shared authenticated role cannot read them.
do $$
declare target record; safe_columns text;
begin
 for target in select * from (values
  ('xp_transactions','metadata'),('bug_reports','matched_hidden_bug_id'),
  ('ai_evaluations','matched_hidden_bug_id')) as tables(table_name,private_column) loop
  select string_agg(quote_ident(column_name),',' order by ordinal_position) into safe_columns
   from information_schema.columns where table_schema='public' and table_name=target.table_name
    and column_name<>target.private_column;
  if safe_columns is null then raise exception 'Required review table missing: %',target.table_name; end if;
  execute format('revoke select on public.%I from public,anon,authenticated',target.table_name);
  execute format('revoke select(%I) on public.%I from public,anon,authenticated',target.private_column,target.table_name);
  execute format('grant select(%s) on public.%I to authenticated',safe_columns,target.table_name);
 end loop;
end $$;

create or replace function public.curriculum_admin_review_details(p_attempt uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.curriculum_is_admin() then raise exception 'Administrator required'; end if;
 return jsonb_build_object(
  'reports',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.bug_reports r where r.attempt_id=p_attempt),'[]'),
  'awarded_bug_ids',coalesce((select jsonb_agg(metadata->>'hiddenBugId') from public.xp_transactions
   where source_id=p_attempt and reason='bug_bonus' and metadata->>'hiddenBugId' is not null),'[]'));
end $$;
revoke all on function public.curriculum_admin_review_details(uuid) from public,anon;
grant execute on function public.curriculum_admin_review_details(uuid) to authenticated;
commit;
notify pgrst,'reload schema';

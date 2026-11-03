begin;
alter table public.bug_reports add column if not exists environment text not null default '';
alter table public.bug_reports add column if not exists evidence_url text;
alter table public.bug_reports add column if not exists request_id uuid;
create unique index if not exists report_request_once on public.bug_reports(user_id,request_id) where request_id is not null;
commit;
notify pgrst,'reload schema';


-- Production progress columns needed to verify parent-counter repair after deletion.
create type public.module_status as enum ('locked','available','in_progress','completed');
alter table public.module_progress
 add column status public.module_status not null default 'in_progress',
 add column total_lessons integer not null default 0,
 add column completed_lessons integer not null default 0,
 add column completion_percentage integer not null default 0,
 add column completed_at timestamptz;
alter table public.learning_path_progress
 add column completion_percentage integer not null default 0,
 add column completed_modules integer not null default 0,
 add column completed_lessons integer not null default 0,
 add column completed_challenges integer not null default 0,
 add column current_module_id uuid references public.learning_modules(id),
 add column current_lesson_id uuid references public.lessons(id),
 add column current_challenge_id uuid references public.challenges(id);
grant select,insert,update on public.module_progress,public.learning_path_progress to authenticated;

-- Additional production-shaped columns for the isolated HTTP performance fixture.
alter table profiles add column username text, add column avatar_url text;
alter table lessons add column summary text;
update profiles set username = case right(id::text,1) when '2' then 'Bench Tester' when '3' then 'Other Tester' else 'Bench Admin' end;
alter table lesson_progress add column id uuid default gen_random_uuid(),
  add column status text not null default 'not_started',
  add column started_at timestamptz not null default now(),
  add column last_opened_at timestamptz not null default now();
alter table lesson_progress enable row level security;
create policy bench_owned_lesson_progress on lesson_progress to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
alter table module_progress add unique(user_id,module_id);
alter table learning_path_progress add unique(user_id,learning_path_id), add column last_activity_at timestamptz;
alter table module_progress enable row level security;
alter table learning_path_progress enable row level security;
create policy bench_owned_module_progress on module_progress to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy bench_owned_path_progress on learning_path_progress to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
alter table challenges add column title text, add column title_en text, add column title_ar text,
  add column description text, add column description_en text, add column description_ar text,
  add column difficulty text default 'Beginner', add column challenge_type text, add column lab_template text,
  add column lab_template_id uuid, add column scenario text, add column scenario_en text, add column scenario_ar text,
  add column instructions text, add column instructions_en text, add column instructions_ar text,
  add column workflow_type text, add column sort_order integer default 0;
alter table challenge_attempts add column updated_at timestamptz default now(), add column submitted_at timestamptz;
alter table badges add column name text, add column name_ar text, add column description text, add column icon_url text;
update badges set name = badge_key;
grant select on user_badges,badges to authenticated;
alter table user_badges enable row level security;
create policy bench_owned_badges on user_badges for select to authenticated using(user_id=auth.uid());

insert into learning_paths(id,slug,title_en,title_ar,description_en,sort_order,is_active)
select md5('path'||p)::uuid,'bench-'||p,'Benchmark path '||p,'المسار '||p,'Practice software testing.',p,true
from generate_series(1,4) p;
insert into learning_modules(id,learning_path_id,slug,title_en,title_ar,description_en,sort_order,is_published)
select md5('module'||p||'-'||m)::uuid,md5('path'||p)::uuid,'module-'||m,'Benchmark module '||m,'الوحدة '||m,'Explore testing techniques.',m,true
from generate_series(1,4) p cross join generate_series(1,4) m;
insert into lessons(id,learning_path_id,module_id,slug,title,title_en,title_ar,summary_en,content,content_en,content_ar,objectives_en,estimated_minutes,difficulty,sort_order,is_published)
select md5('lesson'||p||'-'||m||'-'||l)::uuid,md5('path'||p)::uuid,md5('module'||p||'-'||m)::uuid,
  'lesson-'||m||'-'||l,'Benchmark lesson '||m||'.'||l,'Benchmark lesson '||m||'.'||l,'الدرس '||m||'.'||l,'Test a real workflow.',
  repeat(E'## Testing a workflow\n\nCheck the result and record reproducible steps.\n\n',30),
  repeat(E'## Testing a workflow\n\nCheck the result and record reproducible steps. $x^2 + y^2$.\n\n| Test | Result |\n| --- | --- |\n| Login | Passed |\n\n',22),
  repeat(E'## اختبار سير العمل\n\nتحقق من النتيجة وسجّل خطوات إعادة الاختبار.\n\n',26),
  array['Write a reproducible test'],12,'Beginner',l,true
from generate_series(1,4) p cross join generate_series(1,4) m cross join generate_series(1,12) l;
insert into challenges(id,slug,title,title_en,title_ar,learning_path_id,module_id,is_active,is_required,status)
select md5('challenge'||p||'-'||m)::uuid,'challenge-'||p||'-'||m,'Benchmark challenge '||m,'Benchmark challenge '||m,'التحدي '||m,
  md5('path'||p)::uuid,md5('module'||p||'-'||m)::uuid,true,false,'published'
from generate_series(1,4) p cross join generate_series(1,4) m;
insert into lesson_progress(user_id,lesson_id,status,completed_at,last_opened_at)
select '00000000-0000-4000-8000-000000000002',id,'completed',now(),now()-interval '1 day'
from lessons where learning_path_id<>md5('path1')::uuid or id=md5('lesson1-1-1')::uuid;
insert into module_progress(user_id,module_id,status)
select '00000000-0000-4000-8000-000000000002',id,'completed'
from learning_modules where learning_path_id<>md5('path1')::uuid;
insert into challenge_attempts(user_id,challenge_id,status,is_passed,submitted_at,created_at,updated_at)
select '00000000-0000-4000-8000-000000000002',c.id,
  case when n=1 then 'approved' when n=2 then 'submitted' else 'rejected' end,n=1,
  now()-n*interval '1 day',now()-n*interval '1 day',now()-n*interval '1 day'
from challenges c cross join generate_series(1,32) n
where c.learning_path_id<>md5('path1')::uuid or n<=4;
insert into bug_reports(user_id,challenge_id,title,status)
select '00000000-0000-4000-8000-000000000002',id,'Benchmark report','Reviewed' from challenges;
insert into user_badges(user_id,badge_id,earned_at)
select '00000000-0000-4000-8000-000000000002',id,now() from badges limit 2;

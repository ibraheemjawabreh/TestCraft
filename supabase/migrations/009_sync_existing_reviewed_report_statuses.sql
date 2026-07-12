-- Repair reports that were reviewed before the admin UPDATE policy existed.
-- Each challenge has one attempt per tester, so this join is unambiguous.

update public.bug_reports as report
set status = case
  when attempt.status = 'approved' then 'Reviewed'::public.report_status
  else 'Rejected'::public.report_status
end
from public.challenge_attempts as attempt
where attempt.user_id = report.user_id
  and attempt.challenge_id = report.challenge_id
  and report.status = 'Pending'
  and attempt.status in ('approved', 'needs_improvement', 'rejected');

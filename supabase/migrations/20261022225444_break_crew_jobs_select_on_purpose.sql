-- Step 3: break one policy on purpose to prove the RLS tests catch it.
-- Reverted by the next migration (restore_crew_jobs_select). Never leave this applied.

-- Any logged-in user, crew included, can now read every job.
drop policy jobs_crew_select_own on public.jobs;

create policy jobs_crew_select_own on public.jobs
  for select to authenticated
  using (true);

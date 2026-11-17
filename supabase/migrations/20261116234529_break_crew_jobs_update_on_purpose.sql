-- Step 14a: break the rules on purpose to prove the summary tests catch it.
-- Reverted by the next migration (restore_crew_jobs_update). Never leave this applied.

-- Crews can now update their own jobs directly, every column.
create policy jobs_crew_update_own on public.jobs
  for update to authenticated
  using (crew_id = (select public.my_crew_id()))
  with check (crew_id = (select public.my_crew_id()));

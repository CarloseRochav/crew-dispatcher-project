-- Step 3: undo the deliberate break from break_crew_jobs_select_on_purpose.
-- Same policy as in the initial schema: a crew reads only its own crew's jobs.

drop policy jobs_crew_select_own on public.jobs;

create policy jobs_crew_select_own on public.jobs
  for select to authenticated
  using (crew_id = (select public.my_crew_id()));
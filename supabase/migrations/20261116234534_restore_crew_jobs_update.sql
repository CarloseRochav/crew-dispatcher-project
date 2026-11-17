-- Step 14a: undo break_crew_jobs_update_on_purpose. Crews again have no update
-- policy on jobs and change them only through update_job_status().
drop policy jobs_crew_update_own on public.jobs;

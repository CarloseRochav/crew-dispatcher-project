-- Step 10a: break the timeline's read rule on purpose to prove the RLS tests catch it.
-- Reverted by the next migration (restore_job_events_select). Never leave this applied.

-- Any logged-in user, crew included, can now read every job's events.
create policy job_events_any_select on public.job_events
  for select to authenticated
  using (true);

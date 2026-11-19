-- Step 17: break the note rule on purpose to prove the RLS tests catch it.
-- Reverted by the next migration (restore_crew_note_keeps_status). Never leave this applied.
-- A note with no status now sends the job back to scheduled instead of keeping its status.

create or replace function public.update_job_status(
  p_job_id uuid,
  p_new_status public.job_status default null,
  p_note text default null
)
returns public.jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_crew_id uuid := public.my_crew_id();
  v_note text := nullif(trim(p_note), '');
  v_new_status public.job_status;
  v_job public.jobs;
begin
  if v_crew_id is null then
    raise exception 'Only crew members can update job status'
      using errcode = '42501';
  end if;

  -- No status and no note would be an empty call; refuse it rather than touch the job.
  if p_new_status is null and v_note is null then
    raise exception 'Nothing to change: send a status or a note'
      using errcode = '22004';
  end if;

  if length(v_note) > 1000 then
    raise exception 'Note is too long (max 1000 characters)'
      using errcode = '22001';
  end if;

  -- Same error for "does not exist" and "belongs to another crew",
  -- so a crew cannot probe for other crews' job ids.
  select * into v_job
  from public.jobs
  where id = p_job_id and crew_id = v_crew_id
  for update;

  if not found then
    raise exception 'Job not found'
      using errcode = 'P0002';
  end if;

  -- Broken on purpose: ignores the job's current status.
  v_new_status := coalesce(p_new_status, 'scheduled');

  -- One step at a time, forward or back, so a mistaken tap can be undone.
  -- No jumps (scheduled <-> done). Same status is allowed to just add a note.
  if not (
    v_new_status = v_job.status
    or (v_job.status = 'scheduled' and v_new_status = 'on_site')
    or (v_job.status = 'on_site' and v_new_status in ('scheduled', 'done'))
    or (v_job.status = 'done' and v_new_status = 'on_site')
  ) then
    raise exception 'Cannot move a job from % to %', v_job.status, v_new_status
      using errcode = '22023';
  end if;

  -- Append so a crew cannot erase what the dispatcher wrote.
  update public.jobs
  set status = v_new_status,
      notes = case
        when v_note is null then notes
        when notes = '' then v_note
        else notes || E'\n' || v_note
      end
  where id = p_job_id
  returning * into v_job;

  return v_job;
end;
$$;

-- create or replace keeps existing grants, but restating them makes this file
-- the full record of who may call the function.
revoke execute on function public.update_job_status(uuid, public.job_status, text) from public, anon;
grant execute on function public.update_job_status(uuid, public.job_status, text) to authenticated;

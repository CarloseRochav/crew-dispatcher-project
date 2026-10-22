-- Step 2: initial schema, access rules and the crew status function.
-- Source of truth: docs/spec.md (Data model, Access rules).

-- ============================================================
-- Types
-- ============================================================

create type public.job_status as enum ('scheduled', 'on_site', 'done');
create type public.user_role as enum ('dispatcher', 'crew');

-- ============================================================
-- Tables
-- ============================================================

create table public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0)
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  role public.user_role not null default 'crew',
  crew_id uuid references public.crews (id) on delete set null,
  -- Only crew members belong to a crew; keeps my_crew_id() unambiguous.
  constraint profiles_dispatcher_has_no_crew check (role = 'crew' or crew_id is null)
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (length(trim(customer_name)) > 0),
  address text not null check (length(trim(address)) > 0),
  job_type text not null check (length(trim(job_type)) > 0),
  scheduled_for timestamptz not null,
  status public.job_status not null default 'scheduled',
  -- Nullable so the dispatcher can create a job before picking a crew.
  -- Restrict so deleting a crew never silently orphans its jobs.
  crew_id uuid references public.crews (id) on delete restrict,
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create index jobs_crew_id_scheduled_for_idx on public.jobs (crew_id, scheduled_for);
create index jobs_scheduled_for_idx on public.jobs (scheduled_for);
create index profiles_crew_id_idx on public.profiles (crew_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- ============================================================
-- Profile on signup
-- ============================================================

-- Every new login starts as a crew member with no crew, so it can read no jobs
-- until a dispatcher assigns it. Role is never taken from raw_user_meta_data:
-- the signing-up user controls that field.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Spec: "A user cannot change their own role." RLS cannot compare old and new
-- values, so a trigger enforces it, for dispatchers too.
-- auth.uid() is null in the SQL editor and for the service role, so seeding works.
create function public.prevent_self_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.id = (select auth.uid())
     and (new.role is distinct from old.role or new.crew_id is distinct from old.crew_id) then
    raise exception 'You cannot change your own role or crew'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_self_role_change
  before update on public.profiles
  for each row execute function public.prevent_self_role_change();

-- ============================================================
-- Access helpers
-- ============================================================

-- security definer so policies can read profiles without triggering the
-- profiles policies again (infinite recursion). Each only reveals the caller's own row.
create function public.is_dispatcher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'dispatcher'
  );
$$;

create function public.my_crew_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select crew_id from public.profiles
  where id = (select auth.uid()) and role = 'crew';
$$;

revoke execute on function public.is_dispatcher() from public, anon;
revoke execute on function public.my_crew_id() from public, anon;
grant execute on function public.is_dispatcher() to authenticated;
grant execute on function public.my_crew_id() to authenticated;

-- ============================================================
-- Row-level security
-- ============================================================

alter table public.crews enable row level security;
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;

-- Defense in depth: no policy targets anon, and anon gets no table privileges either.
revoke all on public.crews, public.profiles, public.jobs from anon;

-- Function calls are wrapped in (select ...) so Postgres evaluates them once
-- per query instead of once per row.

-- crews
create policy crews_dispatcher_all on public.crews
  for all to authenticated
  using ((select public.is_dispatcher()))
  with check ((select public.is_dispatcher()));

create policy crews_crew_select_own on public.crews
  for select to authenticated
  using (id = (select public.my_crew_id()));

-- profiles
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_dispatcher_all on public.profiles
  for all to authenticated
  using ((select public.is_dispatcher()))
  with check ((select public.is_dispatcher()));

-- jobs
create policy jobs_dispatcher_all on public.jobs
  for all to authenticated
  using ((select public.is_dispatcher()))
  with check ((select public.is_dispatcher()));

create policy jobs_crew_select_own on public.jobs
  for select to authenticated
  using (crew_id = (select public.my_crew_id()));

-- No insert, update or delete policy for crews on jobs: they go through
-- update_job_status() below, which touches only status and notes.

-- ============================================================
-- Crew status change
-- ============================================================

create function public.update_job_status(
  p_job_id uuid,
  p_new_status public.job_status,
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
  v_job public.jobs;
begin
  if v_crew_id is null then
    raise exception 'Only crew members can update job status'
      using errcode = '42501';
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

  -- Forward only, one step at a time. Same status is allowed to just add a note.
  if not (
    p_new_status = v_job.status
    or (v_job.status = 'scheduled' and p_new_status = 'on_site')
    or (v_job.status = 'on_site' and p_new_status = 'done')
  ) then
    raise exception 'Cannot move a job from % to %', v_job.status, p_new_status
      using errcode = '22023';
  end if;

  -- Append so a crew cannot erase what the dispatcher wrote.
  update public.jobs
  set status = p_new_status,
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

revoke execute on function public.update_job_status(uuid, public.job_status, text) from public, anon;
grant execute on function public.update_job_status(uuid, public.job_status, text) to authenticated;

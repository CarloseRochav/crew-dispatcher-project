import { businessDayRange } from "@/lib/business-time";
import type { BoardFilters } from "@/lib/jobs/board-filters";
import { createClient } from "@/lib/supabase/server";

const BOARD_JOB_COLUMNS = "id, customer_name, address, job_type, scheduled_for, status, crew:crews(name)";

export async function getBoardJobs({ date, crew }: BoardFilters) {
  const supabase = await createClient();
  const { start, end } = businessDayRange(date);

  let query = supabase
    .from("jobs")
    .select(BOARD_JOB_COLUMNS)
    .gte("scheduled_for", start.toISOString())
    .lt("scheduled_for", end.toISOString())
    .order("scheduled_for");

  if (crew === "unassigned") query = query.is("crew_id", null);
  else if (crew !== "all") query = query.eq("crew_id", crew);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export type BoardJob = Awaited<ReturnType<typeof getBoardJobs>>[number];

const CREW_DAY_JOB_COLUMNS = "id, customer_name, address, job_type, scheduled_for, status, notes";

// RLS already limits a crew to its own jobs; the crew filter makes the query say so.
export async function getCrewDayJobs(crewId: string, date: string) {
  const supabase = await createClient();
  const { start, end } = businessDayRange(date);
  const { data, error } = await supabase
    .from("jobs")
    .select(CREW_DAY_JOB_COLUMNS)
    .eq("crew_id", crewId)
    .gte("scheduled_for", start.toISOString())
    .lt("scheduled_for", end.toISOString())
    .order("scheduled_for");
  if (error) throw error;
  return data;
}

export type CrewDayJob = Awaited<ReturnType<typeof getCrewDayJobs>>[number];

const JOB_DETAIL_COLUMNS =
  "id, customer_name, address, job_type, scheduled_for, status, crew_id, notes, updated_at";

// null when the job does not exist or RLS hides it; the drawer says so.
export async function getJob(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type JobDetails = NonNullable<Awaited<ReturnType<typeof getJob>>>;

// RLS: only the dispatcher can read job_events (docs/spec.md, Job timeline).
// changed_by_profile is null for changes made with no login ("System").
export async function getJobEvents(jobId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_events")
    .select("id, old_status, new_status, created_at, changed_by_profile:profiles(name)")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export type JobEvent = Awaited<ReturnType<typeof getJobEvents>>[number];

export async function getCrews() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("crews").select("id, name").order("name");
  if (error) throw error;
  return data;
}

export type Crew = Awaited<ReturnType<typeof getCrews>>[number];

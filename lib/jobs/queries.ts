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

export async function getCrews() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("crews").select("id, name").order("name");
  if (error) throw error;
  return data;
}

export type Crew = Awaited<ReturnType<typeof getCrews>>[number];

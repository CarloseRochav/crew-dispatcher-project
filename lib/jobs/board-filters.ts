import { z } from "zod";

const dateSchema = z.iso.date();
const crewSchema = z.union([z.literal("all"), z.literal("unassigned"), z.uuid()]);

export type CrewFilter = z.infer<typeof crewSchema>;

export const NEW_JOB = "new";

export type BoardFilters = {
  date: string;
  crew: CrewFilter;
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// The URL is user input: anything invalid falls back to the default view.
export function parseBoardFilters(searchParams: SearchParams, today: string): BoardFilters {
  const date = dateSchema.safeParse(firstValue(searchParams.date));
  const crew = crewSchema.safeParse(firstValue(searchParams.crew));

  return {
    date: date.success ? date.data : today,
    crew: crew.success ? crew.data : "all",
  };
}

// What the drawer shows: a job id, or "new" for the create form.
const openJobSchema = z.union([z.literal(NEW_JOB), z.uuid()]);

// Anything else in ?job= opens nothing.
export function parseOpenJobId(searchParams: SearchParams) {
  const jobId = openJobSchema.safeParse(firstValue(searchParams.job));
  return jobId.success ? jobId.data : null;
}

// After creating a job, show its day and make sure the filter lets it through:
// "All crews" already does; a narrower filter switches to the job's crew.
export function boardAfterCreate(filters: BoardFilters, job: { date: string; crewId: string | null }) {
  const crew = filters.crew === "all" ? "all" : (job.crewId ?? "unassigned");
  return { date: job.date, crew } satisfies BoardFilters;
}

export function boardHref(filters: BoardFilters, jobId?: string) {
  const params = new URLSearchParams(filters);
  if (jobId) params.set("job", jobId);
  return `/board?${params.toString()}`;
}

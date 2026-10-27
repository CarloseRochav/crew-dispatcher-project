import { z } from "zod";

const dateSchema = z.iso.date();
const crewSchema = z.union([z.literal("all"), z.literal("unassigned"), z.uuid()]);

export type CrewFilter = z.infer<typeof crewSchema>;

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

// The job open in the drawer; anything that is not a uuid opens nothing.
export function parseOpenJobId(searchParams: SearchParams) {
  const jobId = z.uuid().safeParse(firstValue(searchParams.job));
  return jobId.success ? jobId.data : null;
}

export function boardHref(filters: BoardFilters, jobId?: string) {
  const params = new URLSearchParams(filters);
  if (jobId) params.set("job", jobId);
  return `/board?${params.toString()}`;
}

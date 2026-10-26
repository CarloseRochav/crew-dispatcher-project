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

export function boardHref(filters: BoardFilters) {
  return `/board?${new URLSearchParams(filters).toString()}`;
}

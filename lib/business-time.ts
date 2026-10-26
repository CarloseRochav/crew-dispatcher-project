// The business runs on one clock (docs/spec.md, Time zone); scheduled_for is stored in UTC.
export const BUSINESS_TIME_ZONE = "America/Tijuana";

// en-CA formats dates as YYYY-MM-DD.
const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const offsetFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIME_ZONE,
  timeZoneName: "longOffset",
});

const jobTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

const dayLabelFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "short",
  month: "short",
  day: "numeric",
});

const MINUTE_MS = 60_000;

function parseIsoDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

// Minutes the business clock is ahead of UTC at that instant (-420 for UTC-07:00).
function offsetMinutesAt(instant: Date) {
  const zoneName = offsetFormatter
    .formatToParts(instant)
    .find((part) => part.type === "timeZoneName")?.value;
  const match = zoneName?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "-" ? -minutes : minutes;
}

export function businessDateOf(instant: Date) {
  return isoDateFormatter.format(instant);
}

// Callers in Server Components must await connection() first.
export function todayInBusinessZone(now: Date = new Date()) {
  return businessDateOf(now);
}

export function addDays(date: string, days: number) {
  const { year, month, day } = parseIsoDate(date);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function startOfBusinessDay(date: string) {
  const { year, month, day } = parseIsoDate(date);
  const utcMidnight = Date.UTC(year, month - 1, day);
  const firstGuess = utcMidnight - offsetMinutesAt(new Date(utcMidnight)) * MINUTE_MS;
  // Re-check at the guessed instant in case the offset differs there.
  return new Date(utcMidnight - offsetMinutesAt(new Date(firstGuess)) * MINUTE_MS);
}

// Half-open range [start, end) in UTC; a day is 23 or 25 hours on a clock change.
export function businessDayRange(date: string) {
  return { start: startOfBusinessDay(date), end: startOfBusinessDay(addDays(date, 1)) };
}

export function formatJobTime(scheduledFor: string) {
  return jobTimeFormatter.format(new Date(scheduledFor));
}

export function formatDayLabel(date: string) {
  const { year, month, day } = parseIsoDate(date);
  return dayLabelFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}

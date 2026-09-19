import { parseISODateLocal } from "@/lib/format";

export const DEFAULT_TIMEZONE = "UTC";

/**
 * Which calendar day `date` falls on in `timeZone`, as "yyyy-MM-dd". This is
 * the one place actual timezone conversion happens -- everywhere else in the
 * app treats that string as a plain calendar day (via parseISODateLocal) and
 * does arithmetic on it with ordinary local-Date logic, since once a moment
 * has been reduced to "which day", there's nothing timezone-specific left.
 *
 * (`en-CA` is a locale trick, not a locale choice -- its default date format
 * happens to be exactly yyyy-MM-dd.)
 */
export function zonedDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    date,
  );
}

/** "Today" as a plain calendar-day Date, anchored to `timeZone` instead of the server's own. */
export function nowInTimeZone(timeZone: string): Date {
  return parseISODateLocal(zonedDateKey(new Date(), timeZone));
}

/** A moment in time (e.g. a `completedAt` timestamp), reduced to the calendar day it falls on in `timeZone`. */
export function toCalendarDay(date: Date, timeZone: string): Date {
  return parseISODateLocal(zonedDateKey(date, timeZone));
}

/**
 * First instant after `from` that lands on a different calendar day in
 * `timeZone`, to the minute. Found by bisection rather than arithmetic because
 * a day boundary isn't a fixed offset from any instant -- DST shifts move it,
 * and some zones sit on half-hour offsets. 36 hours is a safe upper bound: no
 * zone's day is longer than that even across a transition.
 */
function nextDayBoundary(from: Date, timeZone: string): Date {
  const key = zonedDateKey(from, timeZone);
  let sameDay = from.getTime();
  let nextDay = sameDay + 36 * 60 * 60 * 1000;
  while (nextDay - sameDay > 60_000) {
    const mid = sameDay + Math.floor((nextDay - sameDay) / 2);
    if (zonedDateKey(new Date(mid), timeZone) === key) sameDay = mid;
    else nextDay = mid;
  }
  return new Date(nextDay);
}

/**
 * Splits a span of minutes across the calendar days it actually covers in
 * `timeZone`, as [dayKey, minutes] pairs. A session from 23:40 to 00:38 belongs
 * partly to each day; attributing all of it to the day it started on overstates
 * one day and leaves the next looking idle.
 *
 * `totalMinutes` is authoritative -- it's what was recorded -- so the split is
 * apportioned to sum to exactly that even when the start/end instants imply a
 * slightly different length (manual entries set a duration without an end).
 */
export function splitMinutesByDay(
  startedAt: Date,
  endedAt: Date | null,
  totalMinutes: number,
  timeZone: string,
): [string, number][] {
  if (totalMinutes <= 0) return [];
  const end = endedAt ?? new Date(startedAt.getTime() + totalMinutes * 60_000);
  const spanMs = end.getTime() - startedAt.getTime();
  // A session that ends before it starts, or occupies no time, has no span to
  // divide -- put it all on the day it began.
  if (spanMs <= 0) return [[zonedDateKey(startedAt, timeZone), totalMinutes]];

  const slices: [string, number][] = [];
  let cursor = startedAt;
  while (cursor < end) {
    const boundary = nextDayBoundary(cursor, timeZone);
    const sliceEnd = boundary < end ? boundary : end;
    const sliceMs = sliceEnd.getTime() - cursor.getTime();
    slices.push([zonedDateKey(cursor, timeZone), (sliceMs / spanMs) * totalMinutes]);
    cursor = sliceEnd;
  }

  // Round to whole minutes while preserving the recorded total, so the daily
  // numbers still add up to the session length shown everywhere else.
  const rounded: [string, number][] = slices.map(([day, minutes]) => [day, Math.round(minutes)]);
  const drift = totalMinutes - rounded.reduce((sum, [, minutes]) => sum + minutes, 0);
  if (drift !== 0 && rounded.length > 0) {
    // Give the remainder to the day holding the largest share.
    let largest = 0;
    for (let i = 1; i < rounded.length; i++) if (rounded[i][1] > rounded[largest][1]) largest = i;
    rounded[largest][1] += drift;
  }
  return rounded.filter(([, minutes]) => minutes > 0);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

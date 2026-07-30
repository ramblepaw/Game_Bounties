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

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

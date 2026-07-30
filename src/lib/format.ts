export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

/** Parses a plain "yyyy-MM-dd" string as a local date, not UTC -- `new Date(str)`
 *  reads a date-only string as UTC midnight, which can display as the wrong
 *  day once converted to the browser/server's local time. */
export function parseISODateLocal(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** M/D/YY, e.g. "7/29/26" -- the app's one shared short-date format (a future
 *  per-user setting could offer others, but everything reads this way for now). */
export function formatShortDate(date: Date): string {
  const year = String(date.getFullYear()).slice(-2);
  return `${date.getMonth() + 1}/${date.getDate()}/${year}`;
}

/** The inverse of parseISODateLocal -- reads a Date's own local Y/M/D (no UTC conversion). */
export function formatISODateLocal(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

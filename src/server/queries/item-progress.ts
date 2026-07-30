import "server-only";
import { subDays, differenceInCalendarDays } from "date-fns";
import { db } from "@/lib/db";
import { formatISODateLocal } from "@/lib/format";
import { zonedDateKey, nowInTimeZone, toCalendarDay } from "@/lib/timezone";

export type ItemProgressData = {
  isComplete: boolean;
  completedAt: Date | null;
  currentCount: number;
};

const NO_PROGRESS: ItemProgressData = { isComplete: false, completedAt: null, currentCount: 0 };

/** Loads one user's progress for a set of items, keyed by item id. */
export async function fetchItemProgressMap(
  userId: string,
  itemIds: string[],
): Promise<Map<string, ItemProgressData>> {
  if (itemIds.length === 0) return new Map();
  const rows = await db.checklistItemProgress.findMany({
    where: { userId, itemId: { in: itemIds } },
    select: { itemId: true, isComplete: true, completedAt: true, currentCount: true },
  });
  return new Map(rows.map((r) => [r.itemId, r]));
}

/** Merges a user's progress onto a flat item list, defaulting to "not started" for items with no row yet. */
export function withItemProgress<T extends { id: string }>(
  items: T[],
  progress: Map<string, ItemProgressData>,
): (T & ItemProgressData)[] {
  return items.map((item) => ({ ...item, ...(progress.get(item.id) ?? NO_PROGRESS) }));
}

/**
 * Day-by-day completion counts for one user on one checklist, from their very
 * first completion through today -- not a fixed lookback window, since a
 * checklist can take months and an arbitrary cutoff would either hide most of
 * its history or start well before any real activity happened.
 */
export async function completedByDayForChecklist(checklistId: string, userId: string, timeZone: string) {
  const rows = await db.checklistItemProgress.findMany({
    where: {
      userId,
      isComplete: true,
      completedAt: { not: null },
      item: { section: { tab: { checklistId } } },
    },
    select: { completedAt: true },
    orderBy: { completedAt: "asc" },
  });
  if (rows.length === 0) return [];

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.completedAt) continue;
    const key = zonedDateKey(row.completedAt, timeZone);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = nowInTimeZone(timeZone);
  const firstDay = toCalendarDay(rows[0].completedAt as Date, timeZone);
  const totalDays = differenceInCalendarDays(today, firstDay) + 1;
  const result: { date: string; completed: number }[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const date = formatISODateLocal(subDays(today, i));
    result.push({ date, completed: counts.get(date) ?? 0 });
  }
  return result;
}

import "server-only";
import { subDays, formatISO } from "date-fns";
import { db } from "@/lib/db";

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

/** Day-by-day completion counts for one user on one checklist, for a personal "your pace" chart. */
export async function completedByDayForChecklist(checklistId: string, userId: string, days = 30) {
  const since = subDays(new Date(), days);
  const rows = await db.checklistItemProgress.findMany({
    where: {
      userId,
      isComplete: true,
      completedAt: { gte: since },
      item: { section: { tab: { checklistId } } },
    },
    select: { completedAt: true },
  });

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.completedAt) continue;
    const key = formatISO(row.completedAt, { representation: "date" });
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const result: { date: string; completed: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = formatISO(subDays(new Date(), i), { representation: "date" });
    result.push({ date, completed: counts.get(date) ?? 0 });
  }
  return result;
}

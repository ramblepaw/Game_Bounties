import "server-only";
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

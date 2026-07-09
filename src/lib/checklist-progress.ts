import type { ItemKind } from "@/generated/prisma/enums";

export type ProgressItemInput = {
  kind: ItemKind;
  isComplete: boolean;
  targetCount: number | null;
  currentCount: number;
};

export type ProgressSectionInput<T extends ProgressItemInput = ProgressItemInput> = {
  stageCount: number;
  items: T[];
};

// A COUNTER's target is its weight -- "collect 1000 coins" is 1000 tracked
// units, not one pass/fail objective, so it should move the percentage and
// completion estimate as it's logged rather than only at the very end. A
// STAGE item's weight is its module's stage count for the same reason: each
// stage reached (e.g. "Research 10" out of Caught/Research 10/Perfect) is
// its own tracked unit, not all-or-nothing.
export function itemWeight(item: ProgressItemInput): number {
  if (item.kind === "COUNTER" || item.kind === "STAGE") return Math.max(1, item.targetCount ?? 1);
  return 1;
}

export function itemProgress(item: ProgressItemInput): number {
  if (item.kind === "COUNTER" || item.kind === "STAGE") return Math.min(item.currentCount, itemWeight(item));
  return item.isComplete ? 1 : 0;
}

export function computeChecklistProgress(items: ProgressItemInput[]) {
  const total = items.reduce((sum, i) => sum + itemWeight(i), 0);
  const completed = items.reduce((sum, i) => sum + itemProgress(i), 0);
  return { total, completed, percent: total === 0 ? 0 : Math.round((completed / total) * 100) };
}

/**
 * Flattens a set of modules into their items, resolving each STAGE item's
 * weight to its own module's current stage count -- so editing a module's
 * stage list immediately reflects in stats/estimates without touching every
 * item under it.
 */
export function flattenProgressItems<T extends ProgressItemInput>(sections: ProgressSectionInput<T>[]): T[] {
  return sections.flatMap((s) =>
    s.items.map((item) => (item.kind === "STAGE" ? { ...item, targetCount: s.stageCount } : item)),
  );
}

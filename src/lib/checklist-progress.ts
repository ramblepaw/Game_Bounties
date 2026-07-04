import type { ItemKind } from "@/generated/prisma/enums";

export type ProgressItemInput = {
  kind: ItemKind;
  isComplete: boolean;
  targetCount: number | null;
  currentCount: number;
};

// A COUNTER's target is its weight -- "collect 1000 coins" is 1000 tracked
// units, not one pass/fail objective, so it should move the percentage and
// completion estimate as it's logged rather than only at the very end.
export function itemWeight(item: ProgressItemInput): number {
  if (item.kind === "COUNTER") return Math.max(1, item.targetCount ?? 1);
  return 1;
}

export function itemProgress(item: ProgressItemInput): number {
  if (item.kind === "COUNTER") return Math.min(item.currentCount, itemWeight(item));
  return item.isComplete ? 1 : 0;
}

export function computeChecklistProgress(items: ProgressItemInput[]) {
  const total = items.reduce((sum, i) => sum + itemWeight(i), 0);
  const completed = items.reduce((sum, i) => sum + itemProgress(i), 0);
  return { total, completed, percent: total === 0 ? 0 : Math.round((completed / total) * 100) };
}

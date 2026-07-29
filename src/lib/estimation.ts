import "server-only";
import { differenceInCalendarDays, addDays } from "date-fns";
import { db } from "@/lib/db";
import { itemWeight, computeChecklistProgress, flattenProgressItems } from "@/lib/checklist-progress";
import { asStages } from "@/lib/stages";
import { fetchItemProgressMap, withItemProgress } from "@/server/queries/item-progress";

export type CompletionEstimate = {
  projectedDate: Date | null;
  velocityPerDay: number | null;
  confidence: "none" | "low" | "ok";
};

const WINDOW_DAYS = 14;
const MIN_COMPLETED_ITEMS = 3;
const MIN_DISTINCT_DAYS = 2;

export async function estimateCompletionDate(checklistId: string, userId: string): Promise<CompletionEstimate> {
  const checklist = await db.checklist.findUnique({
    where: { id: checklistId },
    select: {
      tabs: {
        select: {
          sections: {
            select: {
              stages: true,
              items: { select: { id: true, kind: true, targetCount: true } },
            },
          },
        },
      },
    },
  });
  if (!checklist) return { projectedDate: null, velocityPerDay: null, confidence: "none" };

  const allItemIds = checklist.tabs.flatMap((t) => t.sections.flatMap((s) => s.items.map((i) => i.id)));
  const progress = await fetchItemProgressMap(userId, allItemIds);
  const sections = checklist.tabs
    .flatMap((t) => t.sections)
    .map((s) => ({ stageCount: asStages(s.stages).length, items: withItemProgress(s.items, progress) }));
  const items = flattenProgressItems(sections);
  const { total, completed } = computeChecklistProgress(items);
  const remaining = total - completed;

  // A finished item's timestamp is the only signal we record about pacing --
  // there's no log of the individual increments behind a COUNTER, so its full
  // weight lands on the single day it crossed its target rather than being
  // spread across the days it was actually accumulating.
  const completedItems = items.filter(
    (i): i is typeof i & { completedAt: Date } => i.isComplete && i.completedAt !== null,
  );

  if (remaining <= 0) {
    return { projectedDate: null, velocityPerDay: null, confidence: "none" };
  }

  const now = new Date();
  const windowStart = addDays(now, -WINDOW_DAYS);

  const inWindow = completedItems.filter((i) => i.completedAt >= windowStart);
  const distinctDays = new Set(inWindow.map((i) => i.completedAt.toDateString())).size;

  if (completedItems.length < MIN_COMPLETED_ITEMS || distinctDays < MIN_DISTINCT_DAYS) {
    return { projectedDate: null, velocityPerDay: null, confidence: "none" };
  }

  // The denominator is days since the *earliest completion in the window*,
  // not days since the checklist was created -- a checklist can sit around
  // for a while before anyone actually starts working through it, and
  // dividing by that idle time would silently understate the real pace.
  const earliestInWindow = inWindow.reduce(
    (min, i) => (i.completedAt < min ? i.completedAt : min),
    inWindow[0].completedAt,
  );
  const daysSinceEarliestActivity = differenceInCalendarDays(now, earliestInWindow) + 1;
  const effectiveWindowDays = Math.min(WINDOW_DAYS, daysSinceEarliestActivity);

  const unitsInWindow = inWindow.reduce((sum, i) => sum + itemWeight(i), 0);
  const velocityPerDay = unitsInWindow / effectiveWindowDays;
  if (velocityPerDay <= 0) {
    return { projectedDate: null, velocityPerDay: null, confidence: "none" };
  }

  const daysToFinish = Math.ceil(remaining / velocityPerDay);
  const projectedDate = addDays(now, daysToFinish);
  const confidence = effectiveWindowDays >= 5 ? "ok" : "low";

  return { projectedDate, velocityPerDay, confidence };
}

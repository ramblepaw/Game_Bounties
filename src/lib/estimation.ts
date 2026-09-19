import "server-only";
import { differenceInCalendarDays, addDays } from "date-fns";
import { db } from "@/lib/db";
import { computeChecklistProgress, flattenProgressItems } from "@/lib/checklist-progress";
import { asStages } from "@/lib/stages";
import { fetchItemProgressMap, withItemProgress } from "@/server/queries/item-progress";
import { nowInTimeZone, toCalendarDay } from "@/lib/timezone";

export type CompletionEstimate = {
  projectedDate: Date | null;
  velocityPerDay: number | null;
  confidence: "none" | "ok";
};

export async function estimateCompletionDate(
  checklistId: string,
  userId: string,
  timeZone: string,
): Promise<CompletionEstimate> {
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

  // Pacing comes from the progress log rather than from which items happen to
  // be finished. Keying off completions meant a checklist whose only target is
  // a large counter had nothing to estimate from until the very end -- the one
  // case where an estimate is most wanted.
  const firstEvent = await db.checklistItemProgressEvent.findFirst({
    where: { userId, item: { section: { tab: { checklistId } } } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  if (remaining <= 0 || firstEvent === null || completed <= 0) {
    return { projectedDate: null, velocityPerDay: null, confidence: "none" };
  }

  // A simple running average since the very first completion -- total units
  // completed so far divided by every calendar day elapsed since then
  // (including idle days). Deliberately not a recency-weighted rolling
  // window: that version could shift the reported average from one moment
  // to the next with no new data entered, just from the window's edges
  // moving, which read as unpredictable. This number only ever changes when
  // new progress is logged or a full calendar day passes -- and it's the
  // exact same "average" shown per-day in the stats table, so the two never
  // disagree.
  const now = nowInTimeZone(timeZone);
  const daysElapsed = differenceInCalendarDays(now, toCalendarDay(firstEvent.createdAt, timeZone)) + 1;
  // `completed` is the same figure the progress bar shows, and the same total
  // the per-day table accumulates to, so the headline and the table can't
  // report different averages.
  const velocityPerDay = completed / daysElapsed;
  if (velocityPerDay <= 0) {
    return { projectedDate: null, velocityPerDay: null, confidence: "none" };
  }

  const daysToFinish = Math.ceil(remaining / velocityPerDay);
  const projectedDate = addDays(now, daysToFinish);

  return { projectedDate, velocityPerDay, confidence: "ok" };
}

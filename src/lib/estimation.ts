import "server-only";
import { differenceInCalendarDays, addDays } from "date-fns";
import { db } from "@/lib/db";

export type CompletionEstimate = {
  projectedDate: Date | null;
  velocityPerDay: number | null;
  confidence: "none" | "low" | "ok";
};

const WINDOW_DAYS = 14;
const MIN_COMPLETED_ITEMS = 3;
const MIN_DISTINCT_DAYS = 2;

export async function estimateCompletionDate(checklistId: string): Promise<CompletionEstimate> {
  const checklist = await db.checklist.findUnique({
    where: { id: checklistId },
    select: {
      createdAt: true,
      tabs: {
        select: { sections: { select: { items: { select: { isComplete: true, completedAt: true } } } } },
      },
    },
  });
  if (!checklist) return { projectedDate: null, velocityPerDay: null, confidence: "none" };

  const items = checklist.tabs.flatMap((t) => t.sections.flatMap((s) => s.items));
  const total = items.length;
  const completedItems = items.filter(
    (i): i is { isComplete: true; completedAt: Date } => i.isComplete && i.completedAt !== null,
  );
  const remaining = total - completedItems.length;

  if (remaining <= 0) {
    return { projectedDate: null, velocityPerDay: null, confidence: "none" };
  }

  const now = new Date();
  const windowStart = addDays(now, -WINDOW_DAYS);
  const sinceCreation = Math.max(1, differenceInCalendarDays(now, checklist.createdAt));
  const effectiveWindowDays = Math.min(WINDOW_DAYS, sinceCreation);

  const inWindow = completedItems.filter((i) => i.completedAt >= windowStart);
  const distinctDays = new Set(inWindow.map((i) => i.completedAt.toDateString())).size;

  if (completedItems.length < MIN_COMPLETED_ITEMS || distinctDays < MIN_DISTINCT_DAYS) {
    return { projectedDate: null, velocityPerDay: null, confidence: "none" };
  }

  const velocityPerDay = inWindow.length / effectiveWindowDays;
  if (velocityPerDay <= 0) {
    return { projectedDate: null, velocityPerDay: null, confidence: "none" };
  }

  const daysToFinish = Math.ceil(remaining / velocityPerDay);
  const projectedDate = addDays(now, daysToFinish);
  const confidence = effectiveWindowDays >= 5 ? "ok" : "low";

  return { projectedDate, velocityPerDay, confidence };
}

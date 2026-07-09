import "server-only";
import { subDays, formatISO } from "date-fns";
import { db } from "@/lib/db";
import { computeChecklistProgress, flattenProgressItems } from "@/lib/checklist-progress";
import { asStages } from "@/lib/stages";

export async function playtimePerGame() {
  const games = await db.game.findMany({
    select: {
      id: true,
      title: true,
      checklists: {
        select: { playSessions: { select: { durationMinutes: true } } },
      },
    },
  });
  return games
    .map((g) => ({
      title: g.title,
      minutes: g.checklists
        .flatMap((c) => c.playSessions)
        .reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0),
    }))
    .filter((g) => g.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
}

export async function completionVelocityByDay(days = 30) {
  const since = subDays(new Date(), days);
  const items = await db.checklistItem.findMany({
    where: { isComplete: true, completedAt: { gte: since } },
    select: { completedAt: true },
  });

  const counts = new Map<string, number>();
  for (const item of items) {
    if (!item.completedAt) continue;
    const key = formatISO(item.completedAt, { representation: "date" });
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const result: { date: string; completed: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = formatISO(subDays(new Date(), i), { representation: "date" });
    result.push({ date, completed: counts.get(date) ?? 0 });
  }
  return result;
}

export async function tokenHistory(limit = 50) {
  return db.tokenTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: true },
  });
}

export async function allUserBadges() {
  return db.userBadge.findMany({
    orderBy: { awardedAt: "desc" },
    include: { user: true, badge: true },
  });
}

export async function checklistCompletionRates() {
  const checklists = await db.checklist.findMany({
    select: {
      name: true,
      game: { select: { title: true } },
      tabs: {
        select: {
          sections: {
            select: {
              stages: true,
              items: { select: { kind: true, isComplete: true, targetCount: true, currentCount: true } },
            },
          },
        },
      },
    },
  });
  return checklists.map((c) => {
    const sections = c.tabs
      .flatMap((t) => t.sections)
      .map((s) => ({ stageCount: asStages(s.stages).length, items: s.items }));
    const items = flattenProgressItems(sections);
    const { percent } = computeChecklistProgress(items);
    return { label: `${c.game.title} — ${c.name}`, percent };
  });
}


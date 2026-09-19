import "server-only";
import { subDays } from "date-fns";
import { db } from "@/lib/db";
import { computeChecklistProgress, flattenProgressItems } from "@/lib/checklist-progress";
import { asStages } from "@/lib/stages";
import { zonedDateKey } from "@/lib/timezone";

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

// Household-wide activity: each user's own progress is its own event, so this
// deliberately doesn't filter by user -- two people working the same item are
// two separate contributions to the chart.
export async function completionVelocityByDay(timeZone: string, days = 30) {
  const since = subDays(new Date(), days);
  // A counter of 100 is 100 targets and a stage item is one target per stage,
  // exactly as on the checklist's own stats. Counting finished items instead
  // would score a 100-coin counter as a single target, landing entirely on the
  // day it happened to finish.
  const rows = await db.checklistItemProgressEvent.findMany({
    where: { createdAt: { gte: since } },
    select: { delta: true, createdAt: true },
  });

  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = zonedDateKey(row.createdAt, timeZone);
    counts.set(key, (counts.get(key) ?? 0) + row.delta);
  }

  // Bucketed against the viewer's timezone rather than the server's, like
  // every other "which day did this happen on" in the app.
  const result: { date: string; completed: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = zonedDateKey(subDays(new Date(), i), timeZone);
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

export type GameCompletionBreakdown = {
  gameId: string;
  gameTitle: string;
  checklists: {
    checklistName: string;
    perUser: { userId: string; displayName: string; percent: number }[];
  }[];
};

/** Each player's own completion % per checklist, grouped by game -- the household overview's per-player breakdown. */
export async function checklistCompletionRatesByGame(): Promise<GameCompletionBreakdown[]> {
  const [users, checklists] = await Promise.all([
    db.user.findMany({ select: { id: true, displayName: true }, orderBy: { createdAt: "asc" } }),
    db.checklist.findMany({
      select: {
        name: true,
        game: { select: { id: true, title: true } },
        tabs: {
          select: {
            sections: {
              select: {
                stages: true,
                items: {
                  select: {
                    kind: true,
                    targetCount: true,
                    progress: { select: { userId: true, isComplete: true, currentCount: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const byGame = new Map<string, GameCompletionBreakdown>();
  for (const c of checklists) {
    const sections = c.tabs.flatMap((t) => t.sections).map((s) => ({
      stageCount: asStages(s.stages).length,
      items: s.items,
    }));

    const perUser = users.map((user) => {
      const userSections = sections.map((s) => ({
        stageCount: s.stageCount,
        items: s.items.map((item) => {
          const p = item.progress.find((row) => row.userId === user.id);
          return {
            kind: item.kind,
            targetCount: item.targetCount,
            isComplete: p?.isComplete ?? false,
            currentCount: p?.currentCount ?? 0,
          };
        }),
      }));
      const { percent } = computeChecklistProgress(flattenProgressItems(userSections));
      return { userId: user.id, displayName: user.displayName, percent };
    });

    const entry = { checklistName: c.name, perUser };
    const existing = byGame.get(c.game.id);
    if (existing) existing.checklists.push(entry);
    else byGame.set(c.game.id, { gameId: c.game.id, gameTitle: c.game.title, checklists: [entry] });
  }
  return Array.from(byGame.values());
}


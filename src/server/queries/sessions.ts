import "server-only";
import { db } from "@/lib/db";

export async function getActiveSessionFor(userId: string) {
  return db.playSession.findFirst({
    where: { userId, endedAt: null },
    include: { checklist: { include: { game: true } } },
  });
}

// Household-wide log (shown on the shared /sessions page) -- deliberately
// not scoped to a user.
export async function listRecentSessions(limit = 50) {
  return db.playSession.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
    include: { checklist: { include: { game: true } }, user: true },
  });
}

export async function listSessionsForChecklist(checklistId: string, userId: string, limit = 50) {
  return db.playSession.findMany({
    where: { checklistId, userId },
    orderBy: { startedAt: "desc" },
    take: limit,
    include: { checklist: { include: { game: true } }, user: true },
  });
}

export async function totalPlaytimeMinutesForChecklist(checklistId: string, userId: string): Promise<number> {
  const result = await db.playSession.aggregate({
    where: { checklistId, userId, durationMinutes: { not: null } },
    _sum: { durationMinutes: true },
  });
  return result._sum.durationMinutes ?? 0;
}

export async function totalPlaytimeMinutesForGame(gameId: string, userId: string): Promise<number> {
  const result = await db.playSession.aggregate({
    where: { checklist: { gameId }, userId, durationMinutes: { not: null } },
    _sum: { durationMinutes: true },
  });
  return result._sum.durationMinutes ?? 0;
}

export async function sessionCountForChecklist(checklistId: string, userId: string): Promise<number> {
  return db.playSession.count({ where: { checklistId, userId, durationMinutes: { not: null } } });
}

/** Day-by-day playtime for one user on one checklist, for a personal "your time" chart. */
export async function playtimeByDayForChecklist(checklistId: string, userId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const sessions = await db.playSession.findMany({
    where: { checklistId, userId, durationMinutes: { not: null }, startedAt: { gte: since } },
    select: { startedAt: true, durationMinutes: true },
  });

  const totals = new Map<string, number>();
  for (const s of sessions) {
    const key = s.startedAt.toISOString().slice(0, 10);
    totals.set(key, (totals.get(key) ?? 0) + (s.durationMinutes ?? 0));
  }

  const result: { date: string; minutes: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, minutes: totals.get(key) ?? 0 });
  }
  return result;
}

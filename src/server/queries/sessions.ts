import "server-only";
import { subDays, formatISO, differenceInCalendarDays } from "date-fns";
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

/**
 * Day-by-day playtime for one user on one checklist, from their very first
 * session through today -- not a fixed lookback window, for the same reason
 * as completedByDayForChecklist: a checklist can take months, and an
 * arbitrary cutoff either hides most of its history or starts well before
 * any real activity happened.
 */
export async function playtimeByDayForChecklist(checklistId: string, userId: string) {
  const sessions = await db.playSession.findMany({
    where: { checklistId, userId, durationMinutes: { not: null } },
    select: { startedAt: true, durationMinutes: true },
    orderBy: { startedAt: "asc" },
  });
  if (sessions.length === 0) return [];

  const totals = new Map<string, number>();
  for (const s of sessions) {
    const key = formatISO(s.startedAt, { representation: "date" });
    totals.set(key, (totals.get(key) ?? 0) + (s.durationMinutes ?? 0));
  }

  const firstDay = sessions[0].startedAt;
  const totalDays = differenceInCalendarDays(new Date(), firstDay) + 1;
  const result: { date: string; minutes: number }[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const date = formatISO(subDays(new Date(), i), { representation: "date" });
    result.push({ date, minutes: totals.get(date) ?? 0 });
  }
  return result;
}

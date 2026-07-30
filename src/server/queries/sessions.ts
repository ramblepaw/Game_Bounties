import "server-only";
import { subDays, differenceInCalendarDays } from "date-fns";
import { db } from "@/lib/db";
import { formatISODateLocal } from "@/lib/format";
import { zonedDateKey, nowInTimeZone, toCalendarDay } from "@/lib/timezone";

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
export async function playtimeByDayForChecklist(checklistId: string, userId: string, timeZone: string) {
  const sessions = await db.playSession.findMany({
    where: { checklistId, userId, durationMinutes: { not: null } },
    select: { startedAt: true, durationMinutes: true },
    orderBy: { startedAt: "asc" },
  });
  if (sessions.length === 0) return [];

  const totals = new Map<string, number>();
  for (const s of sessions) {
    const key = zonedDateKey(s.startedAt, timeZone);
    totals.set(key, (totals.get(key) ?? 0) + (s.durationMinutes ?? 0));
  }

  const today = nowInTimeZone(timeZone);
  const firstDay = toCalendarDay(sessions[0].startedAt, timeZone);
  const totalDays = differenceInCalendarDays(today, firstDay) + 1;
  const result: { date: string; minutes: number }[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const date = formatISODateLocal(subDays(today, i));
    result.push({ date, minutes: totals.get(date) ?? 0 });
  }
  return result;
}

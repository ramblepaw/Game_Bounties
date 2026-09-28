import "server-only";
import { subDays, differenceInCalendarDays } from "date-fns";
import { db } from "@/lib/db";
import { formatISODateLocal } from "@/lib/format";
import { nowInTimeZone, toCalendarDay, splitMinutesByDay } from "@/lib/timezone";
import { withinRun, type RunWindow } from "@/lib/runs";

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

// Per-checklist session figures are always read through a run window (see
// lib/runs.ts): the sessions table has no notion of which attempt a session
// belonged to, so without one a re-run's time merges into the archived run's.

export async function listSessionsForChecklist(
  checklistId: string,
  userId: string,
  window: RunWindow,
  limit = 50,
) {
  return db.playSession.findMany({
    where: { checklistId, userId, startedAt: withinRun(window) },
    orderBy: { startedAt: "desc" },
    take: limit,
    include: { checklist: { include: { game: true } }, user: true },
  });
}

export async function totalPlaytimeMinutesForChecklist(
  checklistId: string,
  userId: string,
  window: RunWindow,
): Promise<number> {
  const result = await db.playSession.aggregate({
    where: { checklistId, userId, durationMinutes: { not: null }, startedAt: withinRun(window) },
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

export async function sessionCountForChecklist(
  checklistId: string,
  userId: string,
  window: RunWindow,
): Promise<number> {
  return db.playSession.count({
    where: { checklistId, userId, durationMinutes: { not: null }, startedAt: withinRun(window) },
  });
}

/**
 * Day-by-day playtime for one user on one run of a checklist, from the run's
 * first session to the day it was submitted -- or today, while it is still
 * being played. Not a fixed lookback window, for the same reason as
 * completedByDayForChecklist: a checklist can take months, and an arbitrary
 * cutoff either hides most of its history or starts well before any real
 * activity happened.
 */
export async function playtimeByDayForChecklist(
  checklistId: string,
  userId: string,
  timeZone: string,
  window: RunWindow,
) {
  const sessions = await db.playSession.findMany({
    where: { checklistId, userId, durationMinutes: { not: null }, startedAt: withinRun(window) },
    select: { startedAt: true, endedAt: true, durationMinutes: true },
    orderBy: { startedAt: "asc" },
  });
  if (sessions.length === 0) return [];

  const totals = new Map<string, number>();
  for (const s of sessions) {
    // A session that runs past midnight belongs to both days, in the
    // proportion actually played on each.
    for (const [key, minutes] of splitMinutesByDay(s.startedAt, s.endedAt, s.durationMinutes ?? 0, timeZone)) {
      totals.set(key, (totals.get(key) ?? 0) + minutes);
    }
  }

  // A finished run stops on the day it was submitted rather than on today.
  const lastDay = window.to ? toCalendarDay(window.to, timeZone) : nowInTimeZone(timeZone);
  const firstDay = toCalendarDay(sessions[0].startedAt, timeZone);
  const totalDays = differenceInCalendarDays(lastDay, firstDay) + 1;
  const result: { date: string; minutes: number }[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const date = formatISODateLocal(subDays(lastDay, i));
    result.push({ date, minutes: totals.get(date) ?? 0 });
  }
  return result;
}

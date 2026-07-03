import "server-only";
import { db } from "@/lib/db";

export async function getActiveSessionFor(userId: string) {
  return db.playSession.findFirst({
    where: { userId, endedAt: null },
    include: { checklist: { include: { game: true } } },
  });
}

export async function listRecentSessions(limit = 50) {
  return db.playSession.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
    include: { checklist: { include: { game: true } }, user: true },
  });
}

export async function listSessionsForChecklist(checklistId: string, limit = 50) {
  return db.playSession.findMany({
    where: { checklistId },
    orderBy: { startedAt: "desc" },
    take: limit,
    include: { checklist: { include: { game: true } }, user: true },
  });
}

export async function totalPlaytimeMinutesForChecklist(checklistId: string): Promise<number> {
  const result = await db.playSession.aggregate({
    where: { checklistId, durationMinutes: { not: null } },
    _sum: { durationMinutes: true },
  });
  return result._sum.durationMinutes ?? 0;
}

export async function totalPlaytimeMinutesForGame(gameId: string): Promise<number> {
  const result = await db.playSession.aggregate({
    where: { checklist: { gameId }, durationMinutes: { not: null } },
    _sum: { durationMinutes: true },
  });
  return result._sum.durationMinutes ?? 0;
}

export async function sessionCountForChecklist(checklistId: string): Promise<number> {
  return db.playSession.count({ where: { checklistId, durationMinutes: { not: null } } });
}

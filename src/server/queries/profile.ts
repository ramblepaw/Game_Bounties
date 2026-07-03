import "server-only";
import { db } from "@/lib/db";

export async function getProfileData(userId: string) {
  const [user, badges, completedCount, totalMinutes] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.userBadge.findMany({
      where: { userId },
      orderBy: { awardedAt: "desc" },
      include: { badge: true },
    }),
    db.checklistCompletion.count({ where: { completedById: userId, status: "APPROVED" } }),
    db.playSession.aggregate({
      where: { userId, durationMinutes: { not: null } },
      _sum: { durationMinutes: true },
    }),
  ]);

  return {
    user,
    badges,
    completedCount,
    totalMinutes: totalMinutes._sum.durationMinutes ?? 0,
  };
}

/** A user's history of approved completions, most recent first. */
export async function listApprovedCompletionsFor(userId: string) {
  return db.checklistCompletion.findMany({
    where: { completedById: userId, status: "APPROVED" },
    orderBy: { reviewedAt: "desc" },
    include: { checklist: { include: { game: true } }, reviewedBy: true },
  });
}

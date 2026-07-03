import "server-only";
import { db } from "@/lib/db";

export const COMPLETIONIST_BADGE_KEY = "COMPLETIONIST_GENERIC";

/** Awards the generic Completionist badge to a user for an approved completion. */
export async function awardCompletionistBadge(userId: string, completionId: string) {
  const badge = await db.badge.findUniqueOrThrow({ where: { key: COMPLETIONIST_BADGE_KEY } });
  return db.userBadge.create({
    data: { userId, badgeId: badge.id, completionId },
  });
}

/**
 * Awards whichever badge this checklist grants: its own custom badge if one's
 * been configured (name/icon set in the designer), else the generic one.
 * Upserts the per-checklist Badge each time so later edits to the name/icon
 * propagate to future awards.
 */
export async function awardBadgeForCompletion(
  checklistId: string,
  userId: string,
  completionId: string,
  checklistBadge: { badgeName: string | null; badgeIconUrl: string | null },
) {
  if (!checklistBadge.badgeName) {
    return awardCompletionistBadge(userId, completionId);
  }

  const key = `CHECKLIST_BADGE_${checklistId}`;
  const badge = await db.badge.upsert({
    where: { key },
    create: { key, name: checklistBadge.badgeName, iconUrl: checklistBadge.badgeIconUrl },
    update: { name: checklistBadge.badgeName, iconUrl: checklistBadge.badgeIconUrl },
  });
  return db.userBadge.create({
    data: { userId, badgeId: badge.id, completionId },
  });
}

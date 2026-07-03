import "server-only";
import { addMonths } from "date-fns";
import { db } from "@/lib/db";

export const COOLDOWN_MONTHS = 6;

export type CooldownInfo = { completionId: string; readyAt: Date } | null;

/**
 * Whether this specific user is still on cooldown for this checklist.
 * Scoped per (checklistId, userId) — NOT "whoever most recently got this
 * checklist approved" — so one household member re-running the checklist
 * can't silently clear their partner's still-active cooldown.
 */
export async function getCooldownFor(checklistId: string, userId: string): Promise<CooldownInfo> {
  const completion = await db.checklistCompletion.findFirst({
    where: { checklistId, completedById: userId, status: "APPROVED" },
    orderBy: { reviewedAt: "desc" },
  });
  if (!completion || !completion.reviewedAt || completion.cooldownWaivedAt) return null;

  const readyAt = addMonths(completion.reviewedAt, COOLDOWN_MONTHS);
  if (readyAt <= new Date()) return null;

  return { completionId: completion.id, readyAt };
}

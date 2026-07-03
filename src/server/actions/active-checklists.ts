"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_ACTIVE_CHECKLIST_LIMIT } from "@/lib/limits";
import { getCooldownFor } from "@/lib/cooldown";
import { resetChecklistProgress } from "@/server/actions/checklist-progress-reset";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export type ActivateResult = { error: string | null };

/** Marks a checklist as "running" for the current user, subject to their WIP limit. */
export async function activateChecklist(checklistId: string): Promise<ActivateResult> {
  const session = await requireSession();

  const existing = await db.activeChecklist.findUnique({
    where: { userId_checklistId: { userId: session.userId, checklistId } },
  });
  if (existing) return { error: null };

  const cooldown = await getCooldownFor(checklistId, session.userId);
  if (cooldown) {
    return {
      error: `You completed this checklist recently — you can run it again on ${cooldown.readyAt.toLocaleDateString()}, or ask your co-op partner to waive the cooldown.`,
    };
  }

  const [user, activeCount] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: session.userId }, select: { activeChecklistLimit: true } }),
    db.activeChecklist.count({ where: { userId: session.userId } }),
  ]);
  const limit = user.activeChecklistLimit ?? DEFAULT_ACTIVE_CHECKLIST_LIMIT;

  if (activeCount >= limit) {
    return {
      error: `You're already running ${activeCount} checklist${activeCount === 1 ? "" : "s"} (limit ${limit}). Stop one first.`,
    };
  }

  await db.activeChecklist.create({ data: { userId: session.userId, checklistId } });
  revalidatePath("/", "layout");
  return { error: null };
}

/** Stops a run. Erases any progress on the checklist — the UI must confirm this first. */
export async function deactivateChecklist(checklistId: string): Promise<void> {
  const session = await requireSession();
  await resetChecklistProgress(checklistId);
  await db.activeChecklist.deleteMany({ where: { userId: session.userId, checklistId } });
  revalidatePath("/", "layout");
}

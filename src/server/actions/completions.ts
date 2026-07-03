"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { awardBadgeForCompletion } from "@/lib/badges";
import { DEFAULT_TOKENS_PER_COMPLETION } from "@/lib/token-economy";
import { resetChecklistProgress } from "@/server/actions/checklist-progress-reset";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export type SubmitState = { error: string | null };

export async function submitForApproval(
  checklistId: string,
  _prevState: SubmitState,
  _formData: FormData,
): Promise<SubmitState> {
  const session = await requireSession();

  const checklist = await db.checklist.findUnique({
    where: { id: checklistId },
    include: { tabs: { include: { sections: { include: { items: true } } } } },
  });
  if (!checklist) return { error: "Checklist not found." };

  const items = checklist.tabs.flatMap((t) => t.sections.flatMap((s) => s.items));
  if (items.length === 0 || items.some((i) => !i.isComplete)) {
    return { error: "All items must be checked off before submitting for approval." };
  }

  const existingPending = await db.checklistCompletion.findFirst({
    where: { checklistId, status: "PENDING" },
  });
  if (existingPending) {
    return { error: "This checklist is already pending approval." };
  }

  await db.checklistCompletion.create({
    data: { checklistId, completedById: session.userId },
  });

  revalidatePath("/", "layout");
  return { error: null };
}

export async function approveCompletion(completionId: string): Promise<void> {
  const session = await requireSession();

  const completion = await db.checklistCompletion.findUniqueOrThrow({
    where: { id: completionId },
    include: {
      checklist: { select: { tokenReward: true, badgeName: true, badgeIconUrl: true } },
    },
  });
  if (completion.status !== "PENDING") return;
  if (completion.completedById === session.userId) {
    throw new Error("You cannot approve your own completion.");
  }

  const reward = completion.checklist.tokenReward ?? DEFAULT_TOKENS_PER_COMPLETION;

  await db.$transaction(async (tx) => {
    await tx.checklistCompletion.update({
      where: { id: completionId },
      data: { status: "APPROVED", reviewedById: session.userId, reviewedAt: new Date() },
    });
    await tx.tokenTransaction.create({
      data: {
        type: "EARN_COMPLETION",
        amount: reward,
        actorId: completion.completedById,
        completionId,
        reason: "Checklist completion approved",
      },
    });
    // The run is archived now — wipe the board and un-run it so the next
    // attempt (after any cooldown) starts fresh.
    await resetChecklistProgress(completion.checklistId, tx);
    await tx.activeChecklist.deleteMany({
      where: { checklistId: completion.checklistId, userId: completion.completedById },
    });
  });

  await awardBadgeForCompletion(completion.checklistId, completion.completedById, completionId, {
    badgeName: completion.checklist.badgeName,
    badgeIconUrl: completion.checklist.badgeIconUrl,
  });

  revalidatePath("/", "layout");
}

export async function rejectCompletion(completionId: string, reason: string): Promise<void> {
  const session = await requireSession();

  const completion = await db.checklistCompletion.findUniqueOrThrow({
    where: { id: completionId },
  });
  if (completion.status !== "PENDING") return;
  if (completion.completedById === session.userId) {
    throw new Error("You cannot review your own completion.");
  }

  await db.checklistCompletion.update({
    where: { id: completionId },
    data: {
      status: "REJECTED",
      reviewedById: session.userId,
      reviewedAt: new Date(),
      rejectionReason: reason || null,
    },
  });

  revalidatePath("/", "layout");
}

/** Lets the OTHER household member release a player's cooldown on a checklist early. */
export async function waiveCooldown(completionId: string): Promise<void> {
  const session = await requireSession();

  const completion = await db.checklistCompletion.findUniqueOrThrow({ where: { id: completionId } });
  if (completion.status !== "APPROVED") return;
  if (completion.completedById === session.userId) {
    throw new Error("You can't waive your own cooldown — ask your co-op partner.");
  }

  await db.checklistCompletion.update({
    where: { id: completionId },
    data: { cooldownWaivedAt: new Date() },
  });

  revalidatePath("/", "layout");
}

/**
 * Wipes item progress on a rejected run so the submitter can start over
 * clean, instead of fixing forward. The rejected record stays as history.
 */
export async function clearRejectedRun(completionId: string): Promise<void> {
  const session = await requireSession();

  const completion = await db.checklistCompletion.findUniqueOrThrow({ where: { id: completionId } });
  if (completion.status !== "REJECTED") return;
  if (completion.completedById !== session.userId) {
    throw new Error("Only the person who submitted this run can clear it.");
  }

  await resetChecklistProgress(completion.checklistId);
  revalidatePath("/", "layout");
}

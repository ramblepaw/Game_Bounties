import "server-only";
import { db } from "@/lib/db";

/**
 * A run is one player's attempt at a checklist, from the moment their
 * previous run was approved to the moment this one was submitted. Submission
 * is the finish line: once a run is submitted it is done, and approval only
 * ratifies it.
 *
 * The progress log and play sessions are filed under checklist + player with
 * no notion of which attempt they belong to, so every per-checklist figure has
 * to be read through one of these windows. Without that, a finished run's
 * charts keep growing a zero-day every day, and a re-run after the cooldown
 * merges into the archived one -- one chart spanning both, with a total past
 * 100%.
 *
 * `from` is exclusive and `to` inclusive; null means unbounded.
 */
export type RunWindow = { from: Date | null; to: Date | null };

/** Prisma date filter for a run window; undefined when the window is unbounded. */
export function withinRun(window: RunWindow): { gt?: Date; lte?: Date } | undefined {
  if (!window.from && !window.to) return undefined;
  return {
    ...(window.from ? { gt: window.from } : {}),
    ...(window.to ? { lte: window.to } : {}),
  };
}

/**
 * When the player's current attempt began: the moment their last run was
 * approved, or null if they have never finished this checklist. Approval
 * rather than submission, so nothing logged between the two -- which can't
 * happen now that a submitted run is locked, but could before -- lands in the
 * next attempt.
 */
async function currentAttemptStart(
  checklistId: string,
  userId: string,
  client: Pick<typeof db, "checklistCompletion"> = db,
): Promise<Date | null> {
  const lastApproved = await client.checklistCompletion.findFirst({
    where: { checklistId, completedById: userId, status: "APPROVED" },
    orderBy: { submittedAt: "desc" },
    select: { reviewedAt: true },
  });
  return lastApproved?.reviewedAt ?? null;
}

/**
 * This player's most recent submission on the checklist, whatever became of
 * it. Scoped to the player: two household members run a checklist
 * independently, so the other one's submission says nothing about yours.
 */
export async function latestSubmissionFor(checklistId: string, userId: string) {
  return db.checklistCompletion.findFirst({
    where: { checklistId, completedById: userId },
    orderBy: { submittedAt: "desc" },
    include: { reviewedBy: { select: { displayName: true } } },
  });
}

/** The player's submitted run awaiting review on this checklist, if any. */
export async function pendingRunFor(checklistId: string, userId: string) {
  return db.checklistCompletion.findFirst({
    where: { checklistId, completedById: userId, status: "PENDING" },
    select: { id: true, submittedAt: true },
  });
}

export type CurrentRun = {
  window: RunWindow;
  /** The last run this player finished and had approved, for linking to its archive. */
  lastApproved: { id: string; submittedAt: Date } | null;
  /** Set while the player's run is submitted and awaiting review -- the run is done and locked. */
  pending: { id: string; submittedAt: Date } | null;
};

/** The window for what the player is doing on this checklist right now. */
export async function currentRunFor(checklistId: string, userId: string): Promise<CurrentRun> {
  const [lastApproved, pending] = await Promise.all([
    db.checklistCompletion.findFirst({
      where: { checklistId, completedById: userId, status: "APPROVED" },
      orderBy: { submittedAt: "desc" },
      select: { id: true, submittedAt: true, reviewedAt: true },
    }),
    pendingRunFor(checklistId, userId),
  ]);
  return {
    window: { from: lastApproved?.reviewedAt ?? null, to: pending?.submittedAt ?? null },
    lastApproved: lastApproved ? { id: lastApproved.id, submittedAt: lastApproved.submittedAt } : null,
    pending,
  };
}

/**
 * One submitted run -- archived or still awaiting review -- with the window
 * its history falls in. Bounded by the same player's previous approval, so a
 * re-run never bleeds into the run before it.
 */
export async function getRun(completionId: string) {
  const completion = await db.checklistCompletion.findUnique({
    where: { id: completionId },
    include: {
      completedBy: { select: { id: true, displayName: true } },
      reviewedBy: { select: { displayName: true } },
      tokenTransaction: { select: { amount: true } },
      userBadge: { include: { badge: true } },
    },
  });
  if (!completion || completion.status === "REJECTED") return null;

  const previous = await db.checklistCompletion.findFirst({
    where: {
      checklistId: completion.checklistId,
      completedById: completion.completedById,
      status: "APPROVED",
      submittedAt: { lt: completion.submittedAt },
    },
    orderBy: { submittedAt: "desc" },
    select: { reviewedAt: true },
  });

  const window: RunWindow = { from: previous?.reviewedAt ?? null, to: completion.submittedAt };
  return { completion, window };
}

/**
 * Throws away the player's current attempt: its item progress, its progress
 * log, and the time spent in it. Abandoning a run is meant to cost what was
 * put into it, so none of it survives into stats, averages, or the next run.
 */
export async function discardCurrentAttempt(
  checklistId: string,
  userId: string,
  client: Pick<
    typeof db,
    "checklistCompletion" | "checklistItemProgress" | "checklistItemProgressEvent" | "playSession"
  > = db,
): Promise<void> {
  // Through `client`, not `db`: inside a transaction a query on the shared
  // client waits for a connection the transaction is holding -- with a
  // one-connection pool that is a deadlock until the transaction times out.
  const since = await currentAttemptStart(checklistId, userId, client);
  const after = since ? { gt: since } : undefined;
  await client.checklistItemProgressEvent.deleteMany({
    where: { userId, item: { section: { tab: { checklistId } } }, createdAt: after },
  });
  await client.playSession.deleteMany({ where: { userId, checklistId, startedAt: after } });
  await client.checklistItemProgress.deleteMany({
    where: { userId, item: { section: { tab: { checklistId } } } },
  });
}

export const SUBMITTED_RUN_LOCKED = "This run has been submitted for approval and can no longer be changed.";

/** Whether this player's run on the checklist has been submitted -- a submitted run is finished. */
export async function isRunSubmitted(checklistId: string, userId: string): Promise<boolean> {
  return (await pendingRunFor(checklistId, userId)) !== null;
}

/** Refuses a change to a run that has been submitted. */
export async function assertRunNotSubmitted(checklistId: string, userId: string): Promise<void> {
  if (await isRunSubmitted(checklistId, userId)) throw new Error(SUBMITTED_RUN_LOCKED);
}

/** Refuses a progress change on an item whose run has been submitted. */
export async function assertItemRunNotSubmitted(itemId: string, userId: string): Promise<void> {
  const item = await db.checklistItem.findUniqueOrThrow({
    where: { id: itemId },
    select: { section: { select: { tab: { select: { checklistId: true } } } } },
  });
  await assertRunNotSubmitted(item.section.tab.checklistId, userId);
}

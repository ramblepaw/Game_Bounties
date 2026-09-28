import "server-only";
import { db } from "@/lib/db";

/**
 * Resets one user's progress on a checklist back to "not started" -- deletes
 * their ChecklistItemProgress rows for every item under it, leaving anyone
 * else's independent progress on the same checklist untouched.
 *
 * Used on approval, where only the board is wiped: the run's progress log and
 * sessions stay as its archive. Abandoning a run throws those away too -- see
 * discardCurrentAttempt in lib/runs.ts.
 */
export async function resetChecklistProgress(
  checklistId: string,
  userId: string,
  client: Pick<typeof db, "checklistItemProgress"> = db,
): Promise<void> {
  await client.checklistItemProgress.deleteMany({
    where: { userId, item: { section: { tab: { checklistId } } } },
  });
}

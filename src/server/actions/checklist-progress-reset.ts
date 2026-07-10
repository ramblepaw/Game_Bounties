import "server-only";
import { db } from "@/lib/db";

/**
 * Resets one user's progress on a checklist back to "not started" -- deletes
 * their ChecklistItemProgress rows for every item under it, leaving anyone
 * else's independent progress on the same checklist untouched. Shared by
 * approval (that run archived, slate wiped for next time), clearing a
 * rejected run, and stopping a run early, so the relational filter can't
 * drift between call sites.
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

import "server-only";
import { db } from "@/lib/db";

/**
 * Resets every item under a checklist back to incomplete. Shared by approval
 * (run archived, slate wiped for next time), clearing a rejected run, and
 * stopping a run early — so the relational filter can't drift between call sites.
 */
export async function resetChecklistProgress(
  checklistId: string,
  client: Pick<typeof db, "checklistItem"> = db,
): Promise<void> {
  await client.checklistItem.updateMany({
    where: { section: { tab: { checklistId } } },
    data: { isComplete: false, completedAt: null },
  });
}

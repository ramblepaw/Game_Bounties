import "server-only";
import { db } from "@/lib/db";

/** Pending completions submitted by someone other than the given user (peer approval). */
export async function listPendingApprovalsFor(userId: string) {
  return db.checklistCompletion.findMany({
    where: { status: "PENDING", completedById: { not: userId } },
    orderBy: { submittedAt: "asc" },
    include: {
      completedBy: true,
      checklist: { include: { game: true } },
    },
  });
}

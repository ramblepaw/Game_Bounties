import "server-only";
import { db } from "@/lib/db";

export async function listActiveChecklistIdsFor(userId: string): Promise<Set<string>> {
  const rows = await db.activeChecklist.findMany({
    where: { userId },
    select: { checklistId: true },
  });
  return new Set(rows.map((r) => r.checklistId));
}

export async function listActiveChecklistsFor(userId: string) {
  return db.activeChecklist.findMany({
    where: { userId },
    orderBy: { activatedAt: "desc" },
    include: { checklist: { include: { game: true } } },
  });
}

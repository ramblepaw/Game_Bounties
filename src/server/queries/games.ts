import "server-only";
import { db } from "@/lib/db";

export async function listGames() {
  return db.game.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      checklists: {
        include: { tabs: { include: { sections: { include: { items: true } } } } },
      },
    },
  });
}

export function checklistProgress(checklist: {
  tabs: { sections: { items: { isComplete: boolean }[] }[] }[];
}) {
  const items = checklist.tabs.flatMap((t) => t.sections.flatMap((s) => s.items));
  const total = items.length;
  const completed = items.filter((i) => i.isComplete).length;
  return { total, completed, percent: total === 0 ? 0 : Math.round((completed / total) * 100) };
}

export async function getGameWithChecklists(gameId: string) {
  return db.game.findUnique({
    where: { id: gameId },
    include: {
      checklists: {
        orderBy: { order: "asc" },
        include: { tabs: { include: { sections: { include: { items: true } } } } },
      },
      purchases: { orderBy: { purchasedAt: "asc" } },
    },
  });
}

export async function getChecklistDetail(checklistId: string) {
  return db.checklist.findUnique({
    where: { id: checklistId },
    include: {
      game: true,
      tabs: {
        orderBy: { order: "asc" },
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: { items: { orderBy: { order: "asc" } } },
          },
        },
      },
      completions: {
        orderBy: { submittedAt: "desc" },
        take: 1,
        include: { completedBy: true, reviewedBy: true },
      },
    },
  });
}

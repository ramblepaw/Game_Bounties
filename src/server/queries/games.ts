import "server-only";
import { db } from "@/lib/db";
import { computeChecklistProgress, type ProgressItemInput } from "@/lib/checklist-progress";

function bySortTitle<T extends { title: string; sortTitle: string | null }>(games: T[]): T[] {
  return [...games].sort((a, b) => (a.sortTitle || a.title).localeCompare(b.sortTitle || b.title));
}

export async function listGames() {
  const games = await db.game.findMany({
    include: {
      checklists: {
        include: { tabs: { include: { sections: { include: { items: true } } } } },
      },
    },
  });
  return bySortTitle(games);
}

export function checklistProgress(checklist: {
  tabs: { sections: { items: ProgressItemInput[] }[] }[];
}) {
  const items = checklist.tabs.flatMap((t) => t.sections.flatMap((s) => s.items));
  return computeChecklistProgress(items);
}

export async function getGame(gameId: string) {
  return db.game.findUnique({ where: { id: gameId } });
}

export async function listGameTitles() {
  const games = await db.game.findMany({ select: { id: true, title: true, sortTitle: true } });
  return bySortTitle(games);
}

export async function listColorPresets(checklistId: string) {
  return db.checklistColorPreset.findMany({ where: { checklistId }, orderBy: { createdAt: "asc" } });
}

export async function getGameWithChecklists(gameId: string) {
  return db.game.findUnique({
    where: { id: gameId },
    include: {
      checklists: {
        orderBy: { order: "asc" },
        include: { tabs: { include: { sections: { include: { items: true } } } } },
      },
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

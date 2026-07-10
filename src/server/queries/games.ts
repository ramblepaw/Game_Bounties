import "server-only";
import { db } from "@/lib/db";
import {
  computeChecklistProgress,
  flattenProgressItems,
  type ProgressItemInput,
} from "@/lib/checklist-progress";
import { readUploadedImageAsBase64 } from "@/lib/uploads";
import { asStages } from "@/lib/stages";
import { fetchItemProgressMap, withItemProgress } from "@/server/queries/item-progress";

function bySortTitle<T extends { title: string; sortTitle: string | null }>(games: T[]): T[] {
  return [...games].sort((a, b) => (a.sortTitle || a.title).localeCompare(b.sortTitle || b.title));
}

/** Games with each checklist's items carrying `userId`'s own progress (for the "your games" overview). */
export async function listGames(userId: string) {
  const games = await db.game.findMany({
    include: {
      checklists: {
        include: { tabs: { include: { sections: { include: { items: true } } } } },
      },
    },
  });

  const itemIds = games.flatMap((g) =>
    g.checklists.flatMap((c) => c.tabs.flatMap((t) => t.sections.flatMap((s) => s.items.map((i) => i.id)))),
  );
  const progress = await fetchItemProgressMap(userId, itemIds);

  const withProgress = games.map((game) => ({
    ...game,
    checklists: game.checklists.map((checklist) => ({
      ...checklist,
      tabs: checklist.tabs.map((tab) => ({
        ...tab,
        sections: tab.sections.map((section) => ({
          ...section,
          items: withItemProgress(section.items, progress),
        })),
      })),
    })),
  }));

  return bySortTitle(withProgress);
}

export function checklistProgress(checklist: {
  tabs: { sections: { stages: unknown; items: ProgressItemInput[] }[] }[];
}) {
  const sections = checklist.tabs
    .flatMap((t) => t.sections)
    .map((s) => ({ stageCount: asStages(s.stages).length, items: s.items }));
  const items = flattenProgressItems(sections);
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

/**
 * Full structure/style of a checklist as a plain, JSON-safe tree -- no DB ids,
 * timestamps, or progress fields, so it round-trips cleanly through an
 * export -> hand-edit -> import cycle without carrying stale references.
 */
export async function getChecklistExportData(checklistId: string) {
  const checklist = await db.checklist.findUnique({
    where: { id: checklistId },
    include: {
      colorPresets: { orderBy: { createdAt: "asc" } },
      tabs: {
        orderBy: { order: "asc" },
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: { items: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });
  if (!checklist) return null;

  // Bundle any locally-stored images (as opposed to hotlinked external URLs) as base64
  // alongside the JSON tree, so importing onto a different install -- or after this
  // server's /uploads directory has been wiped -- restores the pictures too, not just
  // dangling references to them.
  const localImageUrls = new Set<string>();
  if (checklist.badgeIconUrl) localImageUrls.add(checklist.badgeIconUrl);
  for (const tab of checklist.tabs) {
    if (tab.canvasBgImageUrl) localImageUrls.add(tab.canvasBgImageUrl);
    for (const section of tab.sections) {
      for (const item of section.items) {
        if (item.imageUrl) localImageUrls.add(item.imageUrl);
      }
    }
  }
  const images: Record<string, string> = {};
  await Promise.all(
    Array.from(localImageUrls).map(async (url) => {
      const base64 = await readUploadedImageAsBase64(url);
      if (base64) images[url] = base64;
    }),
  );

  return {
    name: checklist.name,
    description: checklist.description,
    notes: checklist.notes,
    tokenReward: checklist.tokenReward,
    badgeName: checklist.badgeName,
    badgeIconUrl: checklist.badgeIconUrl,
    colorPresets: checklist.colorPresets.map((p) => ({ name: p.name, color: p.color })),
    images,
    tabs: checklist.tabs.map((tab) => ({
      title: tab.title,
      order: tab.order,
      canvasBgColor: tab.canvasBgColor,
      canvasBgImageUrl: tab.canvasBgImageUrl,
      bgColor: tab.bgColor,
      textColor: tab.textColor,
      borderColor: tab.borderColor,
      textSize: tab.textSize,
      sections: tab.sections.map((section) => ({
        name: section.name,
        order: section.order,
        itemLayout: section.itemLayout,
        gridColumns: section.gridColumns,
        span: section.span,
        bgColor: section.bgColor,
        textColor: section.textColor,
        borderColor: section.borderColor,
        textSize: section.textSize,
        fontFamily: section.fontFamily,
        titleBgColor: section.titleBgColor,
        stages: asStages(section.stages),
        items: section.items.map((item) => ({
          title: item.title,
          description: item.description,
          imageUrl: item.imageUrl,
          url: item.url,
          order: item.order,
          bgColor: item.bgColor,
          textColor: item.textColor,
          borderColor: item.borderColor,
          textSize: item.textSize,
          fontFamily: item.fontFamily,
          pixelatedImage: item.pixelatedImage,
          imageFit: item.imageFit,
          imageScale: item.imageScale,
          imagePositionX: item.imagePositionX,
          imagePositionY: item.imagePositionY,
          kind: item.kind,
          targetCount: item.targetCount,
        })),
      })),
    })),
  };
}

/** A game with each checklist's items carrying `userId`'s own progress (for that checklist's progress bar). */
export async function getGameWithChecklists(gameId: string, userId: string) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      checklists: {
        // `createdAt` as a tiebreaker keeps the list stable when two checklists
        // share the same `order` (e.g. two created back-to-back) -- ties in a
        // single-key orderBy aren't guaranteed stable across queries.
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: { tabs: { include: { sections: { include: { items: true } } } } },
      },
    },
  });
  if (!game) return null;

  const itemIds = game.checklists.flatMap((c) =>
    c.tabs.flatMap((t) => t.sections.flatMap((s) => s.items.map((i) => i.id))),
  );
  const progress = await fetchItemProgressMap(userId, itemIds);

  return {
    ...game,
    checklists: game.checklists.map((checklist) => ({
      ...checklist,
      tabs: checklist.tabs.map((tab) => ({
        ...tab,
        sections: tab.sections.map((section) => ({
          ...section,
          items: withItemProgress(section.items, progress),
        })),
      })),
    })),
  };
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

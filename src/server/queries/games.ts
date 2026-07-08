import "server-only";
import { db } from "@/lib/db";
import { computeChecklistProgress, type ProgressItemInput } from "@/lib/checklist-progress";
import { readUploadedImageAsBase64 } from "@/lib/uploads";

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

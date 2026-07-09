"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ItemLayout, ImageFit, ItemKind } from "@/generated/prisma/enums";
import { saveImageFromBase64, uploadKindFromUrl } from "@/lib/uploads";
import { asStages, type StageDef } from "@/lib/stages";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Style/content fields to carry over when cloning an item -- progress is never copied. */
function cloneItemFields(item: {
  title: string;
  description: string | null;
  imageUrl: string | null;
  url: string | null;
  order: number;
  bgColor: string | null;
  textColor: string | null;
  borderColor: string | null;
  textSize: number | null;
  fontFamily: string | null;
  pixelatedImage: boolean;
  imageFit: ImageFit;
  imageScale: number;
  imagePositionX: number;
  imagePositionY: number;
  kind: ItemKind;
  targetCount: number | null;
}) {
  return {
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
  };
}

const checklistSchema = z.object({
  name: z.string().min(1, "Name is required."),
  description: z.string().optional(),
  tokenReward: z.string().optional(),
});

export type ChecklistFormState = { error: string | null };

export async function createChecklist(
  gameId: string,
  _prevState: ChecklistFormState,
  formData: FormData,
): Promise<ChecklistFormState> {
  await requireSession();

  const parsed = checklistSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    tokenReward: formData.get("tokenReward"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const count = await db.checklist.count({ where: { gameId } });

  const checklist = await db.checklist.create({
    data: {
      gameId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      tokenReward: parsed.data.tokenReward ? parseInt(parsed.data.tokenReward, 10) : null,
      order: count,
      tabs: { create: [{ title: "Main", order: 0 }] },
    },
  });

  revalidatePath(`/games/${gameId}`);
  redirect(`/games/${gameId}/checklists/${checklist.id}/edit`);
}

export async function updateChecklist(
  checklistId: string,
  data: {
    name?: string;
    description?: string | null;
    notes?: string | null;
    tokenReward?: number | null;
    badgeName?: string | null;
    badgeIconUrl?: string | null;
  },
): Promise<void> {
  await requireSession();
  await db.checklist.update({ where: { id: checklistId }, data });
  revalidatePath("/", "layout");
}

export async function deleteChecklist(gameId: string, checklistId: string): Promise<void> {
  await requireSession();
  await db.checklist.delete({ where: { id: checklistId } });
  revalidatePath(`/games/${gameId}`);
  redirect(`/games/${gameId}`);
}

export async function duplicateChecklist(gameId: string, checklistId: string): Promise<void> {
  await requireSession();

  const original = await db.checklist.findUniqueOrThrow({
    where: { id: checklistId },
    include: {
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

  const count = await db.checklist.count({ where: { gameId } });

  const duplicate = await db.checklist.create({
    data: {
      gameId,
      name: `${original.name} (copy)`,
      description: original.description,
      order: count,
      tokenReward: original.tokenReward,
      badgeName: original.badgeName,
      badgeIconUrl: original.badgeIconUrl,
      tabs: {
        create: original.tabs.map((tab) => ({
          title: tab.title,
          order: tab.order,
          canvasBgColor: tab.canvasBgColor,
          canvasBgImageUrl: tab.canvasBgImageUrl,
          bgColor: tab.bgColor,
          textColor: tab.textColor,
          borderColor: tab.borderColor,
          textSize: tab.textSize,
          sections: {
            create: tab.sections.map((section) => ({
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
              stages: section.stages ?? [],
              items: {
                // Style/content copies over; progress (isComplete/completedAt/
                // currentCount) intentionally does not -- the duplicate starts fresh.
                create: section.items.map((item) => cloneItemFields(item)),
              },
            })),
          },
        })),
      },
    },
  });

  revalidatePath(`/games/${gameId}`);
  redirect(`/games/${gameId}/checklists/${duplicate.id}/edit`);
}

const importItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  order: z.number().optional(),
  bgColor: z.string().nullable().optional(),
  textColor: z.string().nullable().optional(),
  borderColor: z.string().nullable().optional(),
  textSize: z.number().nullable().optional(),
  fontFamily: z.string().nullable().optional(),
  pixelatedImage: z.boolean().optional(),
  imageFit: z.enum(["CONTAIN", "COVER"]).optional(),
  imageScale: z.number().optional(),
  imagePositionX: z.number().optional(),
  imagePositionY: z.number().optional(),
  kind: z.enum(["CHECKBOX", "COUNTER", "STAGE"]).optional(),
  targetCount: z.number().nullable().optional(),
});

const importSectionSchema = z.object({
  name: z.string().min(1),
  order: z.number().optional(),
  itemLayout: z.enum(["LIST", "GRID"]).optional(),
  gridColumns: z.number().optional(),
  span: z.number().optional(),
  bgColor: z.string().nullable().optional(),
  textColor: z.string().nullable().optional(),
  borderColor: z.string().nullable().optional(),
  textSize: z.number().nullable().optional(),
  fontFamily: z.string().nullable().optional(),
  titleBgColor: z.string().nullable().optional(),
  stages: z
    .array(
      z.object({
        name: z.string(),
        bgColor: z.string().nullable().optional(),
        borderColor: z.string().nullable().optional(),
        textColor: z.string().nullable().optional(),
      }),
    )
    .default([]),
  items: z.array(importItemSchema).default([]),
});

const importTabSchema = z.object({
  title: z.string().min(1),
  order: z.number().optional(),
  canvasBgColor: z.string().nullable().optional(),
  canvasBgImageUrl: z.string().nullable().optional(),
  bgColor: z.string().nullable().optional(),
  textColor: z.string().nullable().optional(),
  borderColor: z.string().nullable().optional(),
  textSize: z.number().nullable().optional(),
  sections: z.array(importSectionSchema).default([]),
});

const importChecklistSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  tokenReward: z.number().nullable().optional(),
  badgeName: z.string().nullable().optional(),
  badgeIconUrl: z.string().nullable().optional(),
  colorPresets: z.array(z.object({ name: z.string().min(1), color: z.string().min(1) })).default([]),
  images: z.record(z.string(), z.string()).default({}),
  tabs: z.array(importTabSchema).min(1, "Must have at least one tab."),
});

export type ImportChecklistFormState = { error: string | null };

export async function importChecklist(
  gameId: string,
  _prevState: ImportChecklistFormState,
  formData: FormData,
): Promise<ImportChecklistFormState> {
  await requireSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a JSON file to import." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    return { error: "That file isn't valid JSON." };
  }

  const parsed = importChecklistSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: `Invalid checklist file: ${parsed.error.issues[0]?.message ?? "unknown error"}` };
  }
  const data = parsed.data;

  // Re-save any bundled images through the normal upload pipeline (which assigns fresh
  // filenames), then point every reference at the new URLs. Best-effort: an image that
  // fails to decode/validate just falls back to its original (likely dead) URL instead
  // of failing the whole import.
  const urlMap = new Map<string, string>();
  await Promise.all(
    Object.entries(data.images).map(async ([originalUrl, base64]) => {
      const kind = uploadKindFromUrl(originalUrl);
      if (!kind) return;
      try {
        urlMap.set(originalUrl, await saveImageFromBase64(base64, kind));
      } catch {
        // Leave unmapped -- falls back to the original (likely dead) URL below.
      }
    }),
  );
  const remap = (url: string | null | undefined): string | null => (url ? (urlMap.get(url) ?? url) : null);

  const count = await db.checklist.count({ where: { gameId } });

  const checklist = await db.checklist.create({
    data: {
      gameId,
      name: data.name,
      description: data.description ?? null,
      notes: data.notes ?? null,
      order: count,
      tokenReward: data.tokenReward ?? null,
      badgeName: data.badgeName ?? null,
      badgeIconUrl: remap(data.badgeIconUrl),
      colorPresets: { create: data.colorPresets },
      tabs: {
        create: data.tabs.map((tab, tabIndex) => ({
          title: tab.title,
          order: tab.order ?? tabIndex,
          canvasBgColor: tab.canvasBgColor ?? null,
          canvasBgImageUrl: remap(tab.canvasBgImageUrl),
          bgColor: tab.bgColor ?? null,
          textColor: tab.textColor ?? null,
          borderColor: tab.borderColor ?? null,
          textSize: tab.textSize ?? null,
          sections: {
            create: tab.sections.map((section, sectionIndex) => ({
              name: section.name,
              order: section.order ?? sectionIndex,
              itemLayout: section.itemLayout ?? "GRID",
              gridColumns: section.gridColumns ?? 4,
              span: section.span ?? 4,
              bgColor: section.bgColor ?? null,
              textColor: section.textColor ?? null,
              borderColor: section.borderColor ?? null,
              textSize: section.textSize ?? null,
              fontFamily: section.fontFamily ?? null,
              titleBgColor: section.titleBgColor ?? null,
              stages: section.stages,
              items: {
                create: section.items.map((item, itemIndex) => ({
                  title: item.title,
                  description: item.description ?? null,
                  imageUrl: remap(item.imageUrl),
                  url: item.url ?? null,
                  order: item.order ?? itemIndex,
                  bgColor: item.bgColor ?? null,
                  textColor: item.textColor ?? null,
                  borderColor: item.borderColor ?? null,
                  textSize: item.textSize ?? null,
                  fontFamily: item.fontFamily ?? null,
                  pixelatedImage: item.pixelatedImage ?? true,
                  imageFit: item.imageFit ?? "CONTAIN",
                  imageScale: item.imageScale ?? 1,
                  imagePositionX: item.imagePositionX ?? 50,
                  imagePositionY: item.imagePositionY ?? 50,
                  kind: item.kind ?? "CHECKBOX",
                  targetCount: item.targetCount ?? null,
                })),
              },
            })),
          },
        })),
      },
    },
  });

  revalidatePath(`/games/${gameId}`);
  redirect(`/games/${gameId}/checklists/${checklist.id}/edit`);
}

export async function moveChecklist(checklistId: string, newGameId: string): Promise<void> {
  await requireSession();
  const count = await db.checklist.count({ where: { gameId: newGameId } });
  await db.checklist.update({
    where: { id: checklistId },
    data: { gameId: newGameId, order: count },
  });
  revalidatePath("/", "layout");
  redirect(`/games/${newGameId}/checklists/${checklistId}/edit`);
}

// ---- Color presets ----

export async function createColorPreset(
  checklistId: string,
  name: string,
  color: string,
): Promise<{ id: string }> {
  await requireSession();
  const preset = await db.checklistColorPreset.create({ data: { checklistId, name, color } });
  revalidatePath("/", "layout");
  return { id: preset.id };
}

export async function deleteColorPreset(id: string): Promise<void> {
  await requireSession();
  await db.checklistColorPreset.delete({ where: { id } });
  revalidatePath("/", "layout");
}

// ---- Tabs ----

export async function createTab(checklistId: string, title?: string): Promise<{ id: string }> {
  await requireSession();
  const count = await db.checklistTab.count({ where: { checklistId } });
  const tab = await db.checklistTab.create({
    data: { checklistId, title: title || "New Tab", order: count },
  });
  revalidatePath("/", "layout");
  return { id: tab.id };
}

export async function duplicateTab(tabId: string): Promise<{ id: string }> {
  await requireSession();
  const original = await db.checklistTab.findUniqueOrThrow({
    where: { id: tabId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: { items: { orderBy: { order: "asc" } } },
      },
    },
  });
  const siblings = await db.checklistTab.findMany({
    where: { checklistId: original.checklistId },
    orderBy: { order: "asc" },
  });

  const duplicate = await db.checklistTab.create({
    data: {
      checklistId: original.checklistId,
      title: original.title,
      order: siblings.length,
      canvasBgColor: original.canvasBgColor,
      canvasBgImageUrl: original.canvasBgImageUrl,
      bgColor: original.bgColor,
      textColor: original.textColor,
      borderColor: original.borderColor,
      textSize: original.textSize,
      sections: {
        create: original.sections.map((section) => ({
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
          stages: section.stages ?? [],
          items: { create: section.items.map((item) => cloneItemFields(item)) },
        })),
      },
    },
  });

  // Slot the duplicate in right after the original instead of leaving it
  // appended at the end, matching how modules/targets duplicate.
  const originalIndex = siblings.findIndex((t) => t.id === tabId);
  const orderedIds = siblings.map((t) => t.id);
  orderedIds.splice(originalIndex + 1, 0, duplicate.id);
  await db.$transaction(renumberTabs(orderedIds));

  revalidatePath("/", "layout");
  return { id: duplicate.id };
}

export type TabStyleInput = {
  title?: string;
  canvasBgColor?: string | null;
  canvasBgImageUrl?: string | null;
  bgColor?: string | null;
  textColor?: string | null;
  borderColor?: string | null;
  textSize?: number | null;
};

export async function updateTab(tabId: string, data: TabStyleInput): Promise<void> {
  await requireSession();
  await db.checklistTab.update({ where: { id: tabId }, data });
  revalidatePath("/", "layout");
}

export async function deleteTab(checklistId: string, tabId: string): Promise<void> {
  await requireSession();
  const count = await db.checklistTab.count({ where: { checklistId } });
  if (count <= 1) return;
  await db.checklistTab.delete({ where: { id: tabId } });
  revalidatePath("/", "layout");
}

/** Bulk reorder after a drag-and-drop move of a checklist's tabs. */
export async function reorderTabs(checklistId: string, orderedTabIds: string[]): Promise<void> {
  await requireSession();
  await db.$transaction(
    orderedTabIds.map((id, index) => db.checklistTab.update({ where: { id }, data: { order: index } })),
  );
  revalidatePath("/", "layout");
}

// ---- Modules (sections) ----

export type ModuleStyleInput = {
  name?: string;
  itemLayout?: ItemLayout;
  gridColumns?: number;
  span?: number;
  bgColor?: string | null;
  textColor?: string | null;
  borderColor?: string | null;
  textSize?: number | null;
  fontFamily?: string | null;
  titleBgColor?: string | null;
  stages?: StageDef[];
};

export async function createSection(tabId: string, afterSectionId?: string): Promise<{ id: string }> {
  await requireSession();
  const siblings = await db.checklistSection.findMany({ where: { tabId }, orderBy: { order: "asc" } });
  const section = await db.checklistSection.create({
    data: { tabId, name: "New Module", itemLayout: "GRID", gridColumns: 4, span: 4, order: siblings.length },
  });

  // Slot the new module in right after the currently-selected one instead of
  // always leaving it appended at the end.
  const afterIndex = afterSectionId ? siblings.findIndex((s) => s.id === afterSectionId) : -1;
  if (afterIndex !== -1) {
    const orderedIds = siblings.map((s) => s.id);
    orderedIds.splice(afterIndex + 1, 0, section.id);
    await db.$transaction(renumberSections(orderedIds));
  }

  revalidatePath("/", "layout");
  return { id: section.id };
}

export async function updateSection(sectionId: string, data: ModuleStyleInput): Promise<void> {
  await requireSession();
  await db.checklistSection.update({ where: { id: sectionId }, data });
  revalidatePath("/", "layout");
}

export async function deleteSection(sectionId: string): Promise<void> {
  await requireSession();
  await db.checklistSection.delete({ where: { id: sectionId } });
  revalidatePath("/", "layout");
}

export async function duplicateSection(sectionId: string): Promise<{ id: string }> {
  await requireSession();
  const original = await db.checklistSection.findUniqueOrThrow({
    where: { id: sectionId },
    include: { items: { orderBy: { order: "asc" } } },
  });
  const siblings = await db.checklistSection.findMany({
    where: { tabId: original.tabId },
    orderBy: { order: "asc" },
  });

  const duplicate = await db.checklistSection.create({
    data: {
      tabId: original.tabId,
      name: original.name,
      order: siblings.length,
      itemLayout: original.itemLayout,
      gridColumns: original.gridColumns,
      span: original.span,
      bgColor: original.bgColor,
      textColor: original.textColor,
      borderColor: original.borderColor,
      textSize: original.textSize,
      fontFamily: original.fontFamily,
      titleBgColor: original.titleBgColor,
      stages: original.stages ?? [],
      items: { create: original.items.map((item) => cloneItemFields(item)) },
    },
  });

  // Slot the duplicate in right after the original instead of leaving it
  // appended at the end, matching how targets duplicate.
  const originalIndex = siblings.findIndex((s) => s.id === sectionId);
  const orderedIds = siblings.map((s) => s.id);
  orderedIds.splice(originalIndex + 1, 0, duplicate.id);
  await db.$transaction(renumberSections(orderedIds));

  revalidatePath("/", "layout");
  return { id: duplicate.id };
}

/** Bulk reorder after a drag-and-drop move within a tab. */
export async function reorderSections(tabId: string, orderedSectionIds: string[]): Promise<void> {
  await requireSession();
  await db.$transaction(
    orderedSectionIds.map((id, index) =>
      db.checklistSection.update({ where: { id }, data: { order: index } }),
    ),
  );
  revalidatePath("/", "layout");
}

// ---- Items ----

export type ItemStyleInput = {
  title?: string;
  description?: string | null;
  imageUrl?: string | null;
  url?: string | null;
  bgColor?: string | null;
  textColor?: string | null;
  borderColor?: string | null;
  textSize?: number | null;
  fontFamily?: string | null;
  pixelatedImage?: boolean;
  imageFit?: ImageFit;
  imageScale?: number;
  imagePositionX?: number;
  imagePositionY?: number;
  kind?: ItemKind;
  targetCount?: number | null;
};

export async function createItem(
  sectionId: string,
  data: ItemStyleInput & { title: string },
): Promise<{ id: string }> {
  await requireSession();
  const count = await db.checklistItem.count({ where: { sectionId } });
  const item = await db.checklistItem.create({
    data: { sectionId, order: count, ...data },
  });
  revalidatePath("/", "layout");
  return { id: item.id };
}

export async function updateItem(itemId: string, data: ItemStyleInput): Promise<void> {
  await requireSession();
  await db.checklistItem.update({ where: { id: itemId }, data });
  revalidatePath("/", "layout");
}

export async function deleteItem(itemId: string): Promise<void> {
  await requireSession();
  await db.checklistItem.delete({ where: { id: itemId } });
  revalidatePath("/", "layout");
}

export async function duplicateItem(itemId: string): Promise<{ id: string }> {
  await requireSession();
  const original = await db.checklistItem.findUniqueOrThrow({ where: { id: itemId } });
  const siblings = await db.checklistItem.findMany({
    where: { sectionId: original.sectionId },
    orderBy: { order: "asc" },
  });
  const count = siblings.length;

  const duplicate = await db.checklistItem.create({
    data: { sectionId: original.sectionId, ...cloneItemFields(original), order: count },
  });

  // Slot the duplicate in right after the original instead of leaving it
  // appended at the end.
  const originalIndex = siblings.findIndex((s) => s.id === itemId);
  const orderedIds = siblings.map((s) => s.id);
  orderedIds.splice(originalIndex + 1, 0, duplicate.id);
  await db.$transaction(renumberItems(orderedIds));

  revalidatePath("/", "layout");
  return { id: duplicate.id };
}

export async function toggleItem(itemId: string): Promise<void> {
  await requireSession();
  const item = await db.checklistItem.findUniqueOrThrow({ where: { id: itemId } });
  await db.checklistItem.update({
    where: { id: itemId },
    data: {
      isComplete: !item.isComplete,
      completedAt: !item.isComplete ? new Date() : null,
    },
  });
  revalidatePath("/", "layout");
}

export async function setCounterValue(itemId: string, value: number): Promise<void> {
  await requireSession();
  const item = await db.checklistItem.findUniqueOrThrow({ where: { id: itemId } });
  const currentCount = Math.max(0, Math.floor(value) || 0);
  const wasComplete = item.isComplete;
  const isComplete = item.targetCount != null && currentCount >= item.targetCount;

  await db.checklistItem.update({
    where: { id: itemId },
    data: {
      currentCount,
      isComplete,
      completedAt: isComplete ? (wasComplete ? item.completedAt : new Date()) : null,
    },
  });
  revalidatePath("/", "layout");
}

/** Sets a STAGE item's current stage (0 = not started, up to its module's stage count). */
export async function setItemStage(itemId: string, stage: number): Promise<void> {
  await requireSession();
  const item = await db.checklistItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { section: { select: { stages: true } } },
  });
  const stageCount = asStages(item.section.stages).length;
  const currentCount = Math.max(0, Math.min(Math.floor(stage) || 0, stageCount));
  const wasComplete = item.isComplete;
  const isComplete = stageCount > 0 && currentCount >= stageCount;

  await db.checklistItem.update({
    where: { id: itemId },
    data: {
      currentCount,
      isComplete,
      completedAt: isComplete ? (wasComplete ? item.completedAt : new Date()) : null,
    },
  });
  revalidatePath("/", "layout");
}

/** Bulk-renumber a section's items to match `orderedIds`, 0-indexed. */
function renumberItems(orderedIds: string[]) {
  return orderedIds.map((id, index) => db.checklistItem.update({ where: { id }, data: { order: index } }));
}

/** Bulk-renumber a tab's modules to match `orderedIds`, 0-indexed. */
function renumberSections(orderedIds: string[]) {
  return orderedIds.map((id, index) => db.checklistSection.update({ where: { id }, data: { order: index } }));
}

/** Bulk-renumber a checklist's tabs to match `orderedIds`, 0-indexed. */
function renumberTabs(orderedIds: string[]) {
  return orderedIds.map((id, index) => db.checklistTab.update({ where: { id }, data: { order: index } }));
}

/**
 * Drag-and-drop move for a target: reorders it within its current module, or
 * moves it into a different module at `targetIndex`, dragging the rest of
 * both modules' items along to stay gap-free.
 */
export async function moveItemToSection(
  itemId: string,
  targetSectionId: string,
  targetIndex: number,
): Promise<void> {
  await requireSession();
  const item = await db.checklistItem.findUniqueOrThrow({ where: { id: itemId } });
  const originSectionId = item.sectionId;

  const targetSiblings = await db.checklistItem.findMany({
    where: { sectionId: targetSectionId, id: { not: itemId } },
    orderBy: { order: "asc" },
  });
  const targetIds = targetSiblings.map((s) => s.id);
  targetIds.splice(Math.max(0, Math.min(targetIndex, targetIds.length)), 0, itemId);

  const updates = [
    ...(originSectionId !== targetSectionId
      ? [db.checklistItem.update({ where: { id: itemId }, data: { sectionId: targetSectionId } })]
      : []),
    ...renumberItems(targetIds),
  ];

  if (originSectionId !== targetSectionId) {
    const originSiblings = await db.checklistItem.findMany({
      where: { sectionId: originSectionId, id: { not: itemId } },
      orderBy: { order: "asc" },
    });
    updates.push(...renumberItems(originSiblings.map((s) => s.id)));
  }

  await db.$transaction(updates);
  revalidatePath("/", "layout");
}

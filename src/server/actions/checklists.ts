"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ItemLayout, ImageFit, ItemKind } from "@/generated/prisma/enums";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
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
};

export async function createSection(tabId: string): Promise<{ id: string }> {
  await requireSession();
  const count = await db.checklistSection.count({ where: { tabId } });
  const section = await db.checklistSection.create({
    data: { tabId, name: "New Module", itemLayout: "GRID", gridColumns: 4, span: 4, order: count },
  });
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

export async function moveItem(
  sectionId: string,
  itemId: string,
  direction: "up" | "down",
): Promise<void> {
  await requireSession();
  const siblings = await db.checklistItem.findMany({ where: { sectionId }, orderBy: { order: "asc" } });
  const index = siblings.findIndex((s) => s.id === itemId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= siblings.length) return;

  const current = siblings[index];
  const swap = siblings[swapIndex];
  await db.$transaction([
    db.checklistItem.update({ where: { id: current.id }, data: { order: swap.order } }),
    db.checklistItem.update({ where: { id: swap.id }, data: { order: current.order } }),
  ]);
  revalidatePath("/", "layout");
}

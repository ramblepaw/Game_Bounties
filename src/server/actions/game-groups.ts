"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Groups are shared, like the games they hold, so only the games page needs refreshing. */
function revalidateLibrary() {
  revalidatePath("/games");
}

export async function createGameGroup(name?: string): Promise<{ id: string }> {
  await requireSession();
  const last = await db.gameGroup.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
  const group = await db.gameGroup.create({
    data: { name: name?.trim() || "New group", order: (last?.order ?? -1) + 1 },
    select: { id: true },
  });
  revalidateLibrary();
  return group;
}

export async function renameGameGroup(groupId: string, name: string): Promise<void> {
  await requireSession();
  const trimmed = name.trim();
  // An empty rename is a slip, not a request for a nameless shelf.
  if (!trimmed) return;
  await db.gameGroup.update({ where: { id: groupId }, data: { name: trimmed } });
  revalidateLibrary();
}

/** The games survive -- the FK is ON DELETE SET NULL, so they fall back to Ungrouped. */
export async function deleteGameGroup(groupId: string): Promise<void> {
  await requireSession();
  await db.gameGroup.delete({ where: { id: groupId } });
  revalidateLibrary();
}

export async function reorderGameGroups(orderedGroupIds: string[]): Promise<void> {
  await requireSession();
  await db.$transaction(
    orderedGroupIds.map((id, index) => db.gameGroup.update({ where: { id }, data: { order: index } })),
  );
  revalidateLibrary();
}

/**
 * Moves one game onto a shelf and rewrites that shelf's ordering in the same
 * transaction. The caller sends the shelf's full post-move order, which keeps a
 * cross-shelf drop and a within-shelf reorder as one operation rather than two
 * that could interleave badly if both players are arranging at once.
 */
export async function moveGameToGroup(
  gameId: string,
  groupId: string | null,
  orderedGameIds: string[],
): Promise<void> {
  await requireSession();

  // Guard against a stale client sending ids that have since moved elsewhere:
  // only positions for games actually landing on this shelf are written.
  const ids = orderedGameIds.includes(gameId) ? orderedGameIds : [...orderedGameIds, gameId];

  await db.$transaction([
    db.game.update({ where: { id: gameId }, data: { groupId } }),
    ...ids.map((id, index) => db.game.update({ where: { id }, data: { groupOrder: index } })),
  ]);
  revalidateLibrary();
}

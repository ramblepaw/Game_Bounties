"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GameCover } from "@/components/games/game-cover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/checklists/progress-bar";
import {
  createGameGroup,
  deleteGameGroup,
  moveGameToGroup,
  renameGameGroup,
  reorderGameGroups,
} from "@/server/actions/game-groups";
import type { Shelf, ShelfGame } from "@/server/queries/games";
import { cn } from "@/lib/cn";

/** Where a dragged game would land: a shelf, and optionally the card to drop before. */
type DropTarget = { shelfId: string | null; beforeGameId: string | null };

function GameCard({
  game,
  shelves,
  currentShelfId,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOverCard,
  onMoveTo,
}: {
  game: ShelfGame;
  shelves: Shelf[];
  currentShelfId: string | null;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverCard: (e: React.DragEvent) => void;
  onMoveTo: (shelfId: string | null) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        // Firefox refuses to start a drag unless something is on the transfer.
        e.dataTransfer.setData("text/plain", game.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOverCard}
      className={cn(
        "group relative flex w-36 cursor-grab flex-col gap-1.5 rounded-xl border border-violet-200 bg-white p-2 text-left shadow-sm transition active:cursor-grabbing dark:border-violet-800 dark:bg-neutral-900",
        isDragging && "opacity-40",
      )}
    >
      <button
        type="button"
        onClick={() => router.push(`/games/${game.id}`)}
        className="flex flex-col gap-1.5 text-left"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-violet-100 dark:bg-violet-950">
          <GameCover
            title={game.title}
            coverImageUrl={game.coverImageUrl}
            secondaryCoverImageUrl={game.secondaryCoverImageUrl}
          />
        </div>
        <p className="truncate text-xs font-semibold text-neutral-900 dark:text-violet-100">
          {game.title}
          {game.secondaryTitle && <span className="text-neutral-400"> &amp; {game.secondaryTitle}</span>}
        </p>
        {game.platform && (
          <p className="truncate text-[10px] text-fuchsia-600 dark:text-fuchsia-400">{game.platform}</p>
        )}
        {/* The whole reason for this view: whether a game has anything to track
            should be visible without opening it. */}
        {game.checklistCount === 0 ? (
          <p className="text-[10px] italic text-neutral-400 dark:text-neutral-500">No checklists</p>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-[10px] text-neutral-500 dark:text-violet-300">
              {game.checklistCount} checklist{game.checklistCount === 1 ? "" : "s"} · {game.percent}%
            </p>
            <ProgressBar percent={game.percent} />
          </div>
        )}
      </button>

      {/* Drag is mouse-only -- HTML5 drag events never fire from a touchscreen --
          so this menu is the equal path, not a fallback. */}
      <div className="absolute right-1 top-1">
        <button
          type="button"
          aria-label={`Move ${game.title} to another group`}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-black/55 text-xs font-bold text-white transition-colors hover:bg-black/75"
        >
          ⋯
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-lg border border-violet-200 bg-white py-1 shadow-xl dark:border-violet-800 dark:bg-neutral-900">
            <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-neutral-400">Move to</p>
            {shelves.map((shelf) => (
              <button
                key={shelf.id ?? "ungrouped"}
                type="button"
                disabled={shelf.id === currentShelfId}
                onClick={() => {
                  setMenuOpen(false);
                  onMoveTo(shelf.id);
                }}
                className="block w-full truncate px-3 py-1.5 text-left text-xs text-neutral-700 hover:bg-violet-50 disabled:opacity-40 dark:text-violet-200 dark:hover:bg-violet-950"
              >
                {shelf.name}
                {shelf.id === currentShelfId && " ✓"}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function GameShelves({ shelves }: { shelves: Shelf[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Mirrored locally so a drop lands instantly instead of snapping back while
  // the server round-trips. Re-seeded whenever the server sends fresh props.
  const [local, setLocal] = useState(shelves);
  const [syncedProps, setSyncedProps] = useState(shelves);
  if (shelves !== syncedProps) {
    setSyncedProps(shelves);
    setLocal(shelves);
  }

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [draggingShelfId, setDraggingShelfId] = useState<string | null>(null);
  const [shelfDropTarget, setShelfDropTarget] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  /** Ungrouped is synthetic rather than a row in the database, so it always trails. */
  function persistShelfOrder(next: Shelf[]) {
    setLocal(next);
    const groupIds = next.filter((s) => s.id !== null).map((s) => s.id as string);
    startTransition(async () => {
      await reorderGameGroups(groupIds);
      router.refresh();
    });
  }

  function reorderShelves(shelfId: string, toIndex: number) {
    const groups = local.filter((s) => s.id !== null);
    const trailing = local.filter((s) => s.id === null);
    const from = groups.findIndex((s) => s.id === shelfId);
    if (from === -1 || toIndex < 0 || toIndex >= groups.length || from === toIndex) return;
    const next = [...groups];
    const [moved] = next.splice(from, 1);
    next.splice(toIndex, 0, moved);
    persistShelfOrder([...next, ...trailing]);
  }

  const groupIndexOf = (shelfId: string) => local.filter((s) => s.id !== null).findIndex((s) => s.id === shelfId);
  const groupCount = local.filter((s) => s.id !== null).length;

  function applyMove(gameId: string, toShelfId: string | null, beforeGameId: string | null) {
    const from = local.find((s) => s.games.some((g) => g.id === gameId));
    if (!from) return;
    const game = from.games.find((g) => g.id === gameId)!;
    // A drop onto the card it started from changes nothing.
    if (from.id === toShelfId && beforeGameId === gameId) return;

    const next = local.map((shelf) => {
      if (shelf.id !== from.id && shelf.id !== toShelfId) return shelf;
      let games = shelf.games.filter((g) => g.id !== gameId);
      if (shelf.id === toShelfId) {
        const at = beforeGameId ? games.findIndex((g) => g.id === beforeGameId) : -1;
        games = at === -1 ? [...games, game] : [...games.slice(0, at), game, ...games.slice(at)];
      }
      return { ...shelf, games };
    });
    setLocal(next);

    const destination = next.find((s) => s.id === toShelfId);
    startTransition(async () => {
      await moveGameToGroup(gameId, toShelfId, destination?.games.map((g) => g.id) ?? [gameId]);
      router.refresh();
    });
  }

  function runAction(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  // Ungrouped's id is genuinely null, which is also the "nothing is being
  // dragged" sentinel -- so every one of these has to check that a drag is
  // actually in progress first. Comparing ids alone left Ungrouped permanently
  // wearing the drop-target highlight and the dragged-shelf dimming.
  const isTargeted = (shelfId: string | null, beforeGameId: string | null) =>
    dropTarget !== null && dropTarget.shelfId === shelfId && dropTarget.beforeGameId === beforeGameId;
  const isShelfTargeted = (shelfId: string | null) => dropTarget !== null && dropTarget.shelfId === shelfId;
  const isReorderTarget = (shelfId: string | null) => shelfId !== null && shelfDropTarget === shelfId;
  const isBeingDragged = (shelfId: string | null) => shelfId !== null && draggingShelfId === shelfId;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500">
          Drag a cover between groups, or use <span className="font-bold">⋯</span> on it to move it. Reorder groups with{" "}
          <span className="font-bold">⠿</span> or the arrows.
        </p>
        <Button size="sm" onClick={() => runAction(() => createGameGroup())}>
          + New group
        </Button>
      </div>

      {local.map((shelf) => {
        // The trailing catch-all isn't a real row in the database, so it can't
        // be renamed or deleted -- but it still accepts drops, which is how a
        // game gets taken off a shelf again.
        const isUngrouped = shelf.id === null;
        return (
          <section
            key={shelf.id ?? "ungrouped"}
            onDragOver={(e) => {
              // A shelf being dragged and a game being dragged both land here,
              // so the two cases have to be told apart before previewing a drop.
              if (draggingShelfId) {
                if (isUngrouped || shelf.id === draggingShelfId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setShelfDropTarget(shelf.id);
                return;
              }
              if (!draggingId) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDropTarget({ shelfId: shelf.id, beforeGameId: null });
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggingShelfId) {
                if (shelf.id && shelf.id !== draggingShelfId) {
                  reorderShelves(draggingShelfId, groupIndexOf(shelf.id));
                }
              } else if (draggingId) {
                applyMove(draggingId, shelf.id, dropTarget?.beforeGameId ?? null);
              }
              setDraggingId(null);
              setDropTarget(null);
              setDraggingShelfId(null);
              setShelfDropTarget(null);
            }}
            className={cn(
              "rounded-2xl border-2 p-3 transition-colors",
              isShelfTargeted(shelf.id) || isReorderTarget(shelf.id)
                ? "border-violet-500 bg-violet-50 dark:bg-violet-950/40"
                : "border-violet-200 dark:border-violet-900",
              isBeingDragged(shelf.id) && "opacity-40",
            )}
          >
            <div className="mb-3 flex items-center gap-2">
              {!isUngrouped && (
                <span
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", shelf.id!);
                    setDraggingShelfId(shelf.id);
                  }}
                  onDragEnd={() => {
                    setDraggingShelfId(null);
                    setShelfDropTarget(null);
                  }}
                  title="Drag to reorder this group"
                  className="cursor-grab select-none text-sm leading-none text-neutral-400 active:cursor-grabbing"
                >
                  ⠿
                </span>
              )}
              {renamingId === shelf.id && shelf.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    runAction(() => renameGameGroup(shelf.id!, renameDraft));
                    setRenamingId(null);
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={() => setRenamingId(null)}
                    className="h-7 w-48 py-1 text-sm"
                  />
                  <Button size="sm" type="submit">
                    Save
                  </Button>
                </form>
              ) : (
                <button
                  type="button"
                  disabled={isUngrouped}
                  onClick={() => {
                    setRenamingId(shelf.id);
                    setRenameDraft(shelf.name);
                  }}
                  title={isUngrouped ? undefined : "Rename group"}
                  className="text-sm font-bold text-violet-950 disabled:cursor-default dark:text-violet-100"
                >
                  {shelf.name}
                </button>
              )}
              <span className="text-xs text-neutral-400">{shelf.games.length}</span>
              {!isUngrouped && (
                <div className="ml-auto flex items-center gap-1">
                  {/* Dragging the handle is mouse-only, so the arrows are how
                      groups get reordered on a touchscreen. */}
                  <button
                    type="button"
                    aria-label={`Move ${shelf.name} up`}
                    disabled={groupIndexOf(shelf.id!) === 0}
                    onClick={() => reorderShelves(shelf.id!, groupIndexOf(shelf.id!) - 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-sm leading-none text-violet-600 transition-colors hover:bg-violet-100 disabled:opacity-25 disabled:hover:bg-transparent dark:text-violet-300 dark:hover:bg-violet-950"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${shelf.name} down`}
                    disabled={groupIndexOf(shelf.id!) === groupCount - 1}
                    onClick={() => reorderShelves(shelf.id!, groupIndexOf(shelf.id!) + 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-sm leading-none text-violet-600 transition-colors hover:bg-violet-100 disabled:opacity-25 disabled:hover:bg-transparent dark:text-violet-300 dark:hover:bg-violet-950"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`Delete the group "${shelf.name}"? Its games move back to Ungrouped.`)) return;
                      runAction(() => deleteGameGroup(shelf.id!));
                    }}
                    className="ml-1 text-xs text-rose-500 hover:underline"
                  >
                    Delete group
                  </button>
                </div>
              )}
            </div>

            {shelf.games.length === 0 ? (
              <p className="py-4 text-center text-xs text-neutral-400">
                {isUngrouped ? "Every game is filed." : "Drop a game here."}
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {shelf.games.map((game) => (
                  <div key={game.id} className="flex items-stretch">
                    <div
                      aria-hidden
                      className={cn(
                        "w-1 rounded-full transition-colors",
                        isTargeted(shelf.id, game.id) ? "bg-violet-500" : "bg-transparent",
                      )}
                    />
                    <GameCard
                      game={game}
                      shelves={local}
                      currentShelfId={shelf.id}
                      isDragging={draggingId === game.id}
                      onDragStart={() => setDraggingId(game.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDropTarget(null);
                      }}
                      onDragOverCard={(e) => {
                        if (!draggingId) return;
                        e.preventDefault();
                        e.stopPropagation();
                        setDropTarget({ shelfId: shelf.id, beforeGameId: game.id });
                      }}
                      onMoveTo={(toShelfId) => applyMove(game.id, toShelfId, null)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

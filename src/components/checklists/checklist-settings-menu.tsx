"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type GameOption = { id: string; title: string };

export function ChecklistSettingsMenu({
  currentGameId,
  games,
  onDuplicate,
  onMove,
  onDelete,
}: {
  currentGameId: string;
  games: GameOption[];
  onDuplicate: () => void;
  onMove: (newGameId: string) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "move">("menu");
  const [targetGameId, setTargetGameId] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const otherGames = games.filter((g) => g.id !== currentGameId);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function close() {
    setOpen(false);
    setView("menu");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Checklist settings"
        aria-expanded={open}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        ⚙️
      </button>
      {open && (
        <div
          className={cn(
            "absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg",
            "dark:border-neutral-700 dark:bg-neutral-900",
          )}
        >
          {view === "menu" ? (
            <div role="menu" className="py-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  onDuplicate();
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Duplicate checklist
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={otherGames.length === 0}
                onClick={() => setView("move")}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-400 disabled:hover:bg-transparent dark:hover:bg-neutral-800"
              >
                Move to another game…
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  onDelete();
                }}
                className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                Delete checklist
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-3">
              <label className="text-xs font-bold text-neutral-500">Move to</label>
              <select
                value={targetGameId}
                onChange={(e) => setTargetGameId(e.target.value)}
                autoFocus
                className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-violet-100"
              >
                <option value="">Choose a game…</option>
                {otherGames.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setView("menu")}
                  className="rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!targetGameId}
                  onClick={() => {
                    close();
                    onMove(targetGameId);
                  }}
                  className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-bold text-white disabled:opacity-40 dark:bg-violet-700"
                >
                  Move
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

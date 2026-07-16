"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * App-level "Checklist / Notes / Games / Stats" toggle — deliberately separate
 * from ChecklistProgressView's own internal tab state, which switches between
 * the checklist's user-authored content tabs (e.g. "Story"/"Side quests").
 */
export function ChecklistViewTabs({
  checklistSlot,
  notesSlot,
  gamesSlot,
  statsSlot,
}: {
  checklistSlot: React.ReactNode;
  notesSlot: React.ReactNode;
  gamesSlot: React.ReactNode;
  statsSlot: React.ReactNode;
}) {
  const [view, setView] = useState<"checklist" | "notes" | "games" | "stats">("checklist");
  const slots = { checklist: checklistSlot, notes: notesSlot, games: gamesSlot, stats: statsSlot };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-700">
        {(["checklist", "notes", "games", "stats"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors",
              view === v
                ? "border-violet-600 text-violet-700 dark:text-violet-300"
                : "border-transparent text-neutral-500 hover:text-violet-700",
            )}
          >
            {v}
          </button>
        ))}
      </div>
      {slots[view]}
    </div>
  );
}

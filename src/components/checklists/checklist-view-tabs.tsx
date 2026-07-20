"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * App-level "Checklist / Notes / Games / Boxes / Stats" toggle — deliberately
 * separate from ChecklistProgressView's own internal tab state, which
 * switches between the checklist's user-authored content tabs (e.g.
 * "Story"/"Side quests"). `boxesSlot` is omitted entirely (not just hidden)
 * when a checklist has no box size set, since most checklists have no
 * real-world storage-unit analog to group items by.
 */
export function ChecklistViewTabs({
  checklistSlot,
  notesSlot,
  gamesSlot,
  boxesSlot,
  statsSlot,
}: {
  checklistSlot: React.ReactNode;
  notesSlot: React.ReactNode;
  gamesSlot: React.ReactNode;
  boxesSlot?: React.ReactNode;
  statsSlot: React.ReactNode;
}) {
  const [view, setView] = useState<"checklist" | "notes" | "games" | "boxes" | "stats">("checklist");
  const slots = { checklist: checklistSlot, notes: notesSlot, games: gamesSlot, boxes: boxesSlot, stats: statsSlot };
  const views = (["checklist", "notes", "games", "boxes", "stats"] as const).filter(
    (v) => v !== "boxes" || boxesSlot !== undefined,
  );
  const activeView = views.includes(view) ? view : "checklist";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-700">
        {views.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors",
              activeView === v
                ? "border-violet-600 text-violet-700 dark:text-violet-300"
                : "border-transparent text-neutral-500 hover:text-violet-700",
            )}
          >
            {v}
          </button>
        ))}
      </div>
      {slots[activeView]}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { reorderChecklists } from "@/server/actions/checklists";
import { ProgressBar } from "@/components/checklists/progress-bar";
import { RunChecklistButton } from "@/components/checklists/run-checklist-button";
import { WaiveCooldownButton } from "@/components/checklists/waive-cooldown-button";

export type ChecklistListItem = {
  id: string;
  name: string;
  progressPercent: number;
  progressCompleted: number;
  progressTotal: number;
  isActive: boolean;
  ownCooldownReadyAt: Date | null;
  peerCooldown: { readyAt: Date; completionId: string } | null;
};

export function ChecklistList({
  gameId,
  checklists,
  peerDisplayName,
}: {
  gameId: string;
  checklists: ChecklistListItem[];
  peerDisplayName: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [draggedId, setDraggedId] = useState<string | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const ids = checklists.map((c) => c.id);
    const draggedIdx = ids.indexOf(draggedId);
    const targetIdx = ids.indexOf(targetId);
    [ids[draggedIdx], ids[targetIdx]] = [ids[targetIdx], ids[draggedIdx]];

    reorderChecklists(gameId, ids).then(refresh);
    setDraggedId(null);
  }

  return (
    <ul className="flex flex-col gap-3">
      {checklists.map((checklist) => (
        <li
          key={checklist.id}
          draggable
          onDragStart={(e) => handleDragStart(e, checklist.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, checklist.id)}
          className="flex flex-col gap-2 rounded-lg border border-violet-200 bg-white p-4 shadow-sm dark:border-violet-800 dark:bg-neutral-900"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="cursor-grab text-neutral-400">⋮⋮</span>
              <span className="font-medium text-violet-950 dark:text-violet-100">{checklist.name}</span>
              {checklist.isActive && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Running
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {checklist.ownCooldownReadyAt ? (
                <p className="max-w-[10rem] text-xs text-neutral-500">
                  You can run this again on {checklist.ownCooldownReadyAt.toLocaleDateString()}
                </p>
              ) : checklist.peerCooldown ? (
                <div className="flex flex-col items-end gap-1">
                  <p className="max-w-[10rem] text-right text-xs text-neutral-500">
                    {peerDisplayName} can run this again on {checklist.peerCooldown.readyAt.toLocaleDateString()}
                  </p>
                  <WaiveCooldownButton completionId={checklist.peerCooldown.completionId} />
                </div>
              ) : (
                <RunChecklistButton
                  checklistId={checklist.id}
                  href={`/games/${gameId}/checklists/${checklist.id}`}
                  isActive={checklist.isActive}
                />
              )}
              <Link
                href={`/games/${gameId}/checklists/${checklist.id}/edit`}
                className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                ✎ Edit
              </Link>
            </div>
          </div>
          <ProgressBar percent={checklist.progressPercent} />
          <p className="text-xs text-neutral-500">
            {checklist.progressCompleted} / {checklist.progressTotal} complete
          </p>
        </li>
      ))}
    </ul>
  );
}

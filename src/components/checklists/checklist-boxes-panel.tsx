"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleItem, setCounterValue, setItemStage } from "@/server/actions/checklists";
import { ItemTile, type ProgressItem } from "@/components/checklists/item-tile";
import type { StageDef } from "@/lib/stages";

export interface BoxItem extends ProgressItem {
  stages: StageDef[];
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

function BoxCard({
  index,
  items,
  onToggle,
  onSetCounter,
  onSetStage,
}: {
  index: number;
  items: BoxItem[];
  onToggle: (itemId: string) => void;
  onSetCounter: (itemId: string, value: number) => void;
  onSetStage: (itemId: string, stage: number) => void;
}) {
  const allComplete = items.length > 0 && items.every((i) => i.isComplete);
  const completedCount = items.filter((i) => i.isComplete).length;

  // Starts collapsed if already fully done (e.g. reloading a finished box),
  // and auto-collapses the moment the last item completes -- but only on
  // that transition, so manually re-expanding afterward isn't immediately
  // undone. Mirrors ModuleCard's behavior for consistency.
  const [collapsed, setCollapsed] = useState(allComplete);
  const wasComplete = useRef(allComplete);
  useEffect(() => {
    if (allComplete && !wasComplete.current) setCollapsed(true);
    wasComplete.current = allComplete;
  }, [allComplete]);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border-2 border-[#4c1d95] bg-[#241b35]">
      <div
        onClick={() => setCollapsed((c) => !c)}
        className="flex cursor-pointer items-center justify-between gap-2 border-b border-[#4c1d95]/40 bg-[#1e1830] p-3"
      >
        <h2 className="font-black text-[#ede9fe]">Box {index + 1}</h2>
        <div className="flex shrink-0 items-center gap-2 text-[#ede9fe]">
          <span>
            {completedCount}/{items.length}
          </span>
          <span className="text-xs text-neutral-400">{collapsed ? "▸" : "▾"}</span>
        </div>
      </div>
      {!collapsed && (
        <div className="grid grid-cols-3 gap-3 p-3 sm:grid-cols-6">
          {items.map((item) => (
            <ItemTile
              key={item.id}
              item={item}
              stages={item.stages}
              layout="GRID"
              onToggle={onToggle}
              onSetCounter={onSetCounter}
              onSetStage={onSetStage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Re-chunks every item across the whole checklist (in the same order they
 * already appear across tabs/modules) into fixed-size "boxes" -- e.g. 30, to
 * mirror a Pokemon game's PC box capacity -- since that grouping has nothing
 * to do with how modules are organized for stats purposes.
 */
export function ChecklistBoxesPanel({ items, boxSize }: { items: BoxItem[]; boxSize: number }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const boxes = chunk(items, boxSize);

  function handleToggle(itemId: string) {
    startTransition(async () => {
      await toggleItem(itemId);
      router.refresh();
    });
  }

  function handleSetCounter(itemId: string, value: number) {
    startTransition(async () => {
      await setCounterValue(itemId, value);
      router.refresh();
    });
  }

  function handleSetStage(itemId: string, stage: number) {
    startTransition(async () => {
      await setItemStage(itemId, stage);
      router.refresh();
    });
  }

  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">No targets on this checklist yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {boxes.map((boxItems, index) => (
        <BoxCard
          key={index}
          index={index}
          items={boxItems}
          onToggle={handleToggle}
          onSetCounter={handleSetCounter}
          onSetStage={handleSetStage}
        />
      ))}
    </div>
  );
}

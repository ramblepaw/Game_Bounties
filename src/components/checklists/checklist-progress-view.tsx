"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleItem, setCounterValue, setItemStage } from "@/server/actions/checklists";
import { resolveBackgroundStyle } from "@/lib/background-style";
import { fontClassForKey } from "@/lib/fonts";
import { type StageDef } from "@/lib/stages";
import { normalizeForSearch } from "@/lib/search";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { ItemTile, type ProgressItem } from "@/components/checklists/item-tile";

export type { ProgressItem };

interface ProgressSection {
  id: string;
  name: string;
  itemLayout: "LIST" | "GRID";
  gridColumns: number;
  span: number;
  bgColor: string | null;
  textColor: string | null;
  borderColor: string | null;
  textSize: number | null;
  fontFamily: string | null;
  titleBgColor: string | null;
  stages: StageDef[];
  items: ProgressItem[];
}

interface ProgressTab {
  id: string;
  title: string;
  canvasBgColor: string | null;
  canvasBgImageUrl: string | null;
  bgColor: string | null;
  textColor: string | null;
  borderColor: string | null;
  textSize: number | null;
  sections: ProgressSection[];
}

function getColSpanClass(span: number): string {
  switch (span) {
    case 1:
      return "col-span-4 md:col-span-1";
    case 2:
      return "col-span-4 md:col-span-2";
    case 3:
      return "col-span-4 md:col-span-3";
    default:
      return "col-span-4";
  }
}

function getGridColsClass(cols: number): string {
  // Below `sm`, cards at the creator's chosen density (often much higher for
  // spreadsheet-style layouts) become too small to tap reliably, so mobile
  // always caps at 2 regardless of cols.
  const map: Record<number, string> = {
    2: "grid-cols-2 sm:grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-6",
    7: "grid-cols-2 sm:grid-cols-7",
    8: "grid-cols-2 sm:grid-cols-8",
    9: "grid-cols-2 sm:grid-cols-9",
    10: "grid-cols-2 sm:grid-cols-10",
    11: "grid-cols-2 sm:grid-cols-11",
    12: "grid-cols-2 sm:grid-cols-12",
    13: "grid-cols-2 sm:grid-cols-[repeat(13,minmax(0,1fr))]",
    14: "grid-cols-2 sm:grid-cols-[repeat(14,minmax(0,1fr))]",
    15: "grid-cols-2 sm:grid-cols-[repeat(15,minmax(0,1fr))]",
    16: "grid-cols-2 sm:grid-cols-[repeat(16,minmax(0,1fr))]",
    17: "grid-cols-2 sm:grid-cols-[repeat(17,minmax(0,1fr))]",
    18: "grid-cols-2 sm:grid-cols-[repeat(18,minmax(0,1fr))]",
    19: "grid-cols-2 sm:grid-cols-[repeat(19,minmax(0,1fr))]",
    20: "grid-cols-2 sm:grid-cols-[repeat(20,minmax(0,1fr))]",
  };
  return map[cols] || "grid-cols-2 sm:grid-cols-4";
}


function ModuleCard({
  section,
  onToggle,
  onSetCounter,
  onSetStage,
}: {
  section: ProgressSection;
  onToggle: (itemId: string) => void;
  onSetCounter: (itemId: string, value: number) => void;
  onSetStage: (itemId: string, stage: number) => void;
}) {
  const allComplete = section.items.length > 0 && section.items.every((i) => i.isComplete);
  const completedCount = section.items.filter((i) => i.isComplete).length;

  // Starts collapsed if already fully done (e.g. reloading a finished module),
  // and auto-collapses the moment the last item completes -- but only on that
  // transition, so manually re-expanding afterward isn't immediately undone.
  const [collapsed, setCollapsed] = useState(allComplete);
  const wasComplete = useRef(allComplete);
  useEffect(() => {
    if (allComplete && !wasComplete.current) setCollapsed(true);
    wasComplete.current = allComplete;
  }, [allComplete]);

  return (
    <div
      style={{ ...resolveBackgroundStyle(section.bgColor, "#241b35"), borderColor: section.borderColor ?? "#4c1d95" }}
      className={cn("flex flex-col overflow-hidden rounded-2xl border-2", getColSpanClass(section.span))}
    >
      <div
        onClick={() => setCollapsed((c) => !c)}
        style={resolveBackgroundStyle(section.titleBgColor, "#1e1830")}
        className="flex cursor-pointer items-center justify-between gap-2 border-b border-[#4c1d95]/40 p-3"
      >
        <h2
          className={cn("min-w-0 truncate font-black", fontClassForKey(section.fontFamily))}
          style={{
            color: section.textColor ?? "#ede9fe",
            fontSize: section.textSize ? `${section.textSize}px` : "1.125rem",
          }}
        >
          {section.name}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={fontClassForKey(section.fontFamily)}
            style={{
              color: section.textColor ?? "#ede9fe",
              fontSize: section.textSize ? `${section.textSize}px` : "1.125rem",
            }}
          >
            {completedCount}/{section.items.length}
          </span>
          <span className="text-xs text-neutral-400">{collapsed ? "▸" : "▾"}</span>
        </div>
      </div>
      {!collapsed && (
        <div className="flex-1 p-3">
          {section.items.length === 0 ? (
            <p className="text-xs text-neutral-400">No items yet.</p>
          ) : (
            <div
              className={
                section.itemLayout === "GRID"
                  ? `grid ${getGridColsClass(section.gridColumns)} gap-3`
                  : "flex flex-col gap-2"
              }
            >
              {section.items.map((item) => (
                <ItemTile
                  key={item.id}
                  item={item}
                  stages={section.stages}
                  layout={section.itemLayout}
                  onToggle={onToggle}
                  onSetCounter={onSetCounter}
                  onSetStage={onSetStage}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ChecklistProgressView({ tabs }: { tabs: ProgressTab[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? "");
  const [query, setQuery] = useState("");

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const normalizedQuery = normalizeForSearch(query.trim());
  const isSearching = normalizedQuery.length > 0;
  // Flattened across every tab -- not just the active one -- since the point
  // of a whole-checklist search is finding a target without already knowing
  // which tab it lives on. Only sections with at least one match are kept,
  // and each keeps only its matching items.
  const matchedSections = isSearching
    ? tabs.flatMap((tab) =>
        tab.sections
          .map((section) => {
            const items = section.items.filter(
              (item) =>
                normalizeForSearch(item.title).includes(normalizedQuery) ||
                (item.description && normalizeForSearch(item.description).includes(normalizedQuery)),
            );
            if (items.length === 0) return null;
            return {
              ...section,
              // Disambiguate which tab a match came from when there's more than one.
              name: tabs.length > 1 ? `${tab.title} · ${section.name}` : section.name,
              items,
            };
          })
          .filter((s): s is ProgressSection => s !== null),
      )
    : [];
  const matchCount = matchedSections.reduce((n, s) => n + s.items.length, 0);

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

  if (!activeTab) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search this checklist…"
          className="max-w-xs"
        />
        {isSearching && (
          <>
            <span className="whitespace-nowrap text-xs text-neutral-500">
              {matchCount} match{matchCount === 1 ? "" : "es"}
            </span>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="whitespace-nowrap text-xs text-violet-600 hover:underline dark:text-violet-400"
            >
              Clear
            </button>
          </>
        )}
      </div>

      {isSearching ? (
        <div className="rounded-xl p-4" style={resolveBackgroundStyle(null, "#1e1830")}>
          <div className="grid auto-rows-min grid-cols-4 gap-4">
            {matchedSections.map((section) => (
              <ModuleCard
                key={section.id}
                section={section}
                onToggle={handleToggle}
                onSetCounter={handleSetCounter}
                onSetStage={handleSetStage}
              />
            ))}
            {matchedSections.length === 0 && (
              <p className="col-span-4 text-neutral-500">No targets match &ldquo;{query.trim()}&rdquo;.</p>
            )}
          </div>
        </div>
      ) : (
        <>
          {tabs.length > 1 && (
            <div className="flex gap-2 overflow-x-auto border-b border-neutral-200 px-1 dark:border-neutral-700">
              {tabs.map((tab) => {
                const isActive = activeTab.id === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTabId(tab.id)}
                    style={{
                      backgroundColor: tab.bgColor ?? undefined,
                      color: tab.textColor ?? undefined,
                      borderTopColor: isActive ? tab.borderColor ?? "#7c3aed" : "transparent",
                      fontSize: tab.textSize ? `${tab.textSize}px` : undefined,
                    }}
                    className={cn(
                      "whitespace-nowrap rounded-t-lg border-t-2 px-4 py-2 text-sm font-bold transition-colors",
                      isActive ? "bg-violet-100 text-violet-900" : "border-transparent text-neutral-500 hover:text-violet-700",
                    )}
                  >
                    {tab.title}
                  </button>
                );
              })}
            </div>
          )}

          <div
            className="rounded-xl p-4"
            style={{
              ...(activeTab.canvasBgImageUrl
                ? { backgroundImage: `url(${activeTab.canvasBgImageUrl})` }
                : resolveBackgroundStyle(activeTab.canvasBgColor, "#1e1830")),
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="grid auto-rows-min grid-cols-4 gap-4">
              {activeTab.sections.map((section) => (
                <ModuleCard
                  key={section.id}
                  section={section}
                  onToggle={handleToggle}
                  onSetCounter={handleSetCounter}
                  onSetStage={handleSetStage}
                />
              ))}
              {activeTab.sections.length === 0 && (
                <p className="col-span-4 text-neutral-500">No modules on this tab yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

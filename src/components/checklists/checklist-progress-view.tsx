"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleItem, setCounterValue } from "@/server/actions/checklists";
import { fontClassForKey } from "@/lib/fonts";
import { cn } from "@/lib/cn";

interface ProgressItem {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  url: string | null;
  bgColor: string | null;
  textColor: string | null;
  borderColor: string | null;
  textSize: number | null;
  fontFamily: string | null;
  pixelatedImage: boolean;
  imageFit: "CONTAIN" | "COVER";
  imageScale: number;
  imagePositionX: number;
  imagePositionY: number;
  kind: "CHECKBOX" | "COUNTER";
  targetCount: number | null;
  currentCount: number;
  isComplete: boolean;
}

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
  const map: Record<number, string> = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };
  return map[cols] || "grid-cols-4";
}

function CounterControl({
  item,
  onChange,
  className,
}: {
  item: Pick<ProgressItem, "id" | "currentCount" | "targetCount">;
  onChange: (value: number) => void;
  className?: string;
}) {
  return (
    <div onClick={(e) => e.stopPropagation()} className={cn("flex items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={() => onChange(item.currentCount + 1)}
        className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold text-white hover:bg-white/20"
      >
        +1
      </button>
      <input
        key={`${item.id}-${item.currentCount}`}
        type="number"
        min={0}
        defaultValue={item.currentCount}
        onBlur={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="w-14 rounded border border-white/20 bg-black/20 px-1 py-0.5 text-center text-xs text-white"
      />
      <span className="text-[10px] text-white/70">/ {item.targetCount ?? "?"}</span>
    </div>
  );
}

export function ChecklistProgressView({ tabs }: { tabs: ProgressTab[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? "");

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

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

  if (!activeTab) return null;

  return (
    <div className="flex flex-col gap-4">
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
          backgroundColor: activeTab.canvasBgColor ?? "#1e1830",
          backgroundImage: activeTab.canvasBgImageUrl ? `url(${activeTab.canvasBgImageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="grid auto-rows-min grid-cols-4 gap-4">
          {activeTab.sections.map((section) => (
            <div
              key={section.id}
              style={{ backgroundColor: section.bgColor ?? "#241b35", borderColor: section.borderColor ?? "#4c1d95" }}
              className={cn("flex flex-col overflow-hidden rounded-2xl border-2", getColSpanClass(section.span))}
            >
              <div className="border-b border-[#4c1d95]/40 bg-[#1e1830] p-3">
                <h2
                  className="font-black"
                  style={{
                    color: section.textColor ?? "#ede9fe",
                    fontSize: section.textSize ? `${section.textSize}px` : "1.125rem",
                  }}
                >
                  {section.name}
                </h2>
              </div>
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
                    {section.items.map((item) => {
                      const isCounter = item.kind === "COUNTER";
                      return (
                      <div
                        key={item.id}
                        role={isCounter ? undefined : "checkbox"}
                        aria-checked={isCounter ? undefined : item.isComplete}
                        tabIndex={isCounter ? undefined : 0}
                        onClick={isCounter ? undefined : () => handleToggle(item.id)}
                        onKeyDown={
                          isCounter
                            ? undefined
                            : (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  handleToggle(item.id);
                                }
                              }
                        }
                        style={{
                          backgroundColor: item.bgColor ?? "rgba(139,92,246,0.08)",
                          borderColor: item.borderColor ?? "transparent",
                          color: item.textColor ?? "#ede9fe",
                        }}
                        className={cn(
                          "overflow-hidden rounded-xl border transition-transform focus:outline-none focus:ring-2 focus:ring-neutral-900",
                          isCounter ? "" : "cursor-pointer hover:scale-[1.02]",
                          section.itemLayout === "GRID"
                            ? "relative flex aspect-square flex-col"
                            : "flex items-center gap-3 p-2",
                          item.isComplete && "opacity-50",
                        )}
                      >
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Open reference link"
                            className={cn(
                              "z-20 flex shrink-0 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80",
                              section.itemLayout === "GRID"
                                ? "absolute right-1.5 top-1.5 h-6 w-6 text-xs"
                                : "order-last ml-auto h-5 w-5 text-[10px]",
                            )}
                          >
                            🔗
                          </a>
                        )}
                        {section.itemLayout === "GRID" ? (
                          <>
                            <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black/5 p-2 pb-8 text-xs text-neutral-400">
                              {item.imageUrl ? (
                                <div className="h-full w-full" style={{ transform: `scale(${item.imageScale})` }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={item.imageUrl}
                                    alt=""
                                    style={{
                                      imageRendering: item.pixelatedImage ? "pixelated" : "auto",
                                      objectFit: item.imageFit === "COVER" ? "cover" : "contain",
                                      objectPosition: `${item.imagePositionX}% ${item.imagePositionY}%`,
                                    }}
                                    className="h-full w-full"
                                  />
                                </div>
                              ) : (
                                "No image"
                              )}
                            </div>
                            <div className="relative z-10 mt-auto flex w-full flex-col gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 pt-8">
                              <span
                                className={cn(
                                  "block text-center font-bold leading-tight",
                                  item.isComplete && "line-through",
                                  fontClassForKey(item.fontFamily),
                                )}
                                style={{ fontSize: item.textSize ? `${item.textSize}px` : "0.875rem" }}
                              >
                                {item.title}
                              </span>
                              {isCounter && (
                                <CounterControl
                                  item={item}
                                  onChange={(value) => handleSetCounter(item.id, value)}
                                  className="justify-center"
                                />
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            {item.imageUrl && (
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-black/10">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.imageUrl}
                                  alt=""
                                  style={{ imageRendering: item.pixelatedImage ? "pixelated" : "auto" }}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <h3
                                className={cn("font-bold", item.isComplete && "line-through", fontClassForKey(item.fontFamily))}
                                style={{ fontSize: item.textSize ? `${item.textSize}px` : "1rem" }}
                              >
                                {item.title}
                              </h3>
                              {item.description && <p className="text-xs opacity-70">{item.description}</p>}
                            </div>
                            {isCounter && (
                              <CounterControl
                                item={item}
                                onChange={(value) => handleSetCounter(item.id, value)}
                                className="order-last ml-auto"
                              />
                            )}
                          </>
                        )}
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
          {activeTab.sections.length === 0 && (
            <p className="col-span-4 text-neutral-500">No modules on this tab yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

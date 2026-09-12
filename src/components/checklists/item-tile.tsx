"use client";

import { useEffect, useRef, useState } from "react";
import { resolveBackgroundStyle, isGradient } from "@/lib/background-style";
import { fontClassForKey } from "@/lib/fonts";
import { resolveStage, type StageDef } from "@/lib/stages";
import { cn } from "@/lib/cn";

export interface ProgressItem {
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
  // ItemTile itself never renders a TITLE-kind item -- callers branch around
  // it and render a plain heading instead -- but the type includes it since
  // that's a real value the underlying data can carry.
  kind: "CHECKBOX" | "COUNTER" | "STAGE" | "TITLE";
  targetCount: number | null;
  currentCount: number;
  isComplete: boolean;
}

const COUNTER_IDLE_SAVE_MS = 1500;

export function CounterControl({
  item,
  onChange,
  className,
}: {
  item: Pick<ProgressItem, "id" | "currentCount" | "targetCount">;
  onChange: (value: number) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(String(item.currentCount));
  const [focused, setFocused] = useState(false);
  const [syncedCount, setSyncedCount] = useState(item.currentCount);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adopt values confirmed by the server (the +/- chips, a tile click, or the
  // other player moving the same counter) -- but never mid-edit, which would
  // yank the field out from under whoever is typing in it.
  if (!focused && item.currentCount !== syncedCount) {
    setSyncedCount(item.currentCount);
    setDraft(String(item.currentCount));
  }

  useEffect(() => {
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  function clearIdle() {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }

  function commit(value: number) {
    clearIdle();
    const next = Math.max(0, value);
    if (next !== item.currentCount) onChange(next);
  }

  // Saving on blur alone meant dismissing the keyboard to make a number stick,
  // which is the worst case on a touch device. Save once typing stops instead.
  // The wait is deliberately longer than a keystroke gap so "150" commits as
  // 150, not as 1 and then 15 -- an intermediate value that lands on the target
  // would otherwise flash the item complete and collapse the module underneath.
  function handleTyping(raw: string) {
    setDraft(raw);
    clearIdle();
    if (raw.trim() === "") return;
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    idleTimer.current = setTimeout(() => {
      idleTimer.current = null;
      commit(parsed);
    }, COUNTER_IDLE_SAVE_MS);
  }

  return (
    <div
      // A tile click bumps the counter, so the controls have to keep their own
      // clicks from counting twice.
      onClick={(e) => e.stopPropagation()}
      className={cn("flex items-center gap-1 text-xs font-bold", className)}
    >
      <button
        type="button"
        onClick={() => commit(item.currentCount - 1)}
        disabled={item.currentCount <= 0}
        aria-label="Decrease by one"
        className="flex h-6 w-6 items-center justify-center rounded-md bg-current/10 text-sm leading-none transition-colors hover:bg-current/20 disabled:opacity-30 disabled:hover:bg-current/10"
      >
        −
      </button>
      <span className="flex items-baseline gap-0.5 tabular-nums">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={draft}
          aria-label="Count"
          onFocus={(e) => {
            setFocused(true);
            e.currentTarget.select();
          }}
          onChange={(e) => handleTyping(e.target.value)}
          onBlur={(e) => {
            setFocused(false);
            commit(parseInt(e.target.value, 10) || 0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              clearIdle();
              setDraft(String(item.currentCount));
              e.currentTarget.blur();
            }
          }}
          // Set inline because globals.css paints bare `input` elements for
          // native form controls -- the old hard black box came from fighting
          // that with classes. Inheriting instead lets the number read as part
          // of the item's own text, whatever colors the creator chose.
          style={{ color: "inherit", backgroundColor: "transparent" }}
          className={cn(
            "w-9 rounded-md border-0 text-right tabular-nums outline-none [appearance:textfield] focus:bg-current/10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            item.targetCount == null && "text-center",
          )}
        />
        {item.targetCount != null && <span className="opacity-60">/{item.targetCount}</span>}
      </span>
      <button
        type="button"
        onClick={() => commit(item.currentCount + 1)}
        aria-label="Increase by one"
        className="flex h-6 w-6 items-center justify-center rounded-md bg-current/10 text-sm leading-none transition-colors hover:bg-current/20"
      >
        +
      </button>
    </div>
  );
}

/** One checklist target -- shared between module rendering and the box view, since both display the same underlying items. */
export function ItemTile({
  item,
  stages,
  layout,
  onToggle,
  onSetCounter,
  onSetStage,
}: {
  item: ProgressItem;
  stages: StageDef[];
  layout: "LIST" | "GRID";
  onToggle: (itemId: string) => void;
  onSetCounter: (itemId: string, value: number) => void;
  onSetStage: (itemId: string, stage: number) => void;
}) {
  const isCounter = item.kind === "COUNTER";
  const isStage = item.kind === "STAGE";
  const stageCount = Math.max(1, stages.length);
  const currentStage = Math.min(item.currentCount, stageCount);
  const resolvedStage = resolveStage(stages, currentStage);
  // A dark shading behind the title keeps text legible over a photo or a
  // plain color, but it also muddies a deliberately-chosen gradient
  // background -- so only apply it when there isn't one.
  const hasGradientBg = !!item.bgColor && isGradient(item.bgColor);

  // Counters were the only kind that ignored a tile click, forcing you onto the
  // small "+1" control.
  function activate() {
    if (isCounter) onSetCounter(item.id, item.currentCount + 1);
    else if (isStage) onSetStage(item.id, (currentStage + 1) % (stageCount + 1));
    else onToggle(item.id);
  }

  return (
    <div
      role={isCounter || isStage ? "button" : "checkbox"}
      aria-checked={isCounter || isStage ? undefined : item.isComplete}
      aria-label={isStage ? resolvedStage.name : undefined}
      tabIndex={0}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      }}
      style={{
        borderColor: isStage ? resolvedStage.borderColor : (item.borderColor ?? "transparent"),
        color: isStage ? resolvedStage.textColor : (item.textColor ?? "#ede9fe"),
      }}
      className={cn(
        "relative isolate cursor-pointer overflow-hidden rounded-xl border transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-neutral-900",
        layout === "GRID" ? "flex aspect-square flex-col" : "flex items-center gap-3 p-2",
        // A grid tile is mostly artwork, and fading the whole thing works there
        // because the art visibly drains of color. A list row is text on a flat
        // fill, where the same rule only makes the text hard to read -- so the
        // row keeps its text crisp and drains the fill instead (see below).
        layout === "GRID" && item.isComplete && "opacity-50 saturate-[0.35]",
      )}
    >
      {/* Painted on its own layer, bled 1px past the edges -- a background
          sized exactly to the box can leave a hairline gap at the rounded
          corners once `hover:scale` promotes this element to its own
          compositing layer, especially with a diagonal gradient. */}
      <div
        className={cn(
          "absolute -inset-px -z-10",
          // The list row's "done" signal: the fill loses its color and mostly
          // recedes into the module behind it, while the title above stays at
          // full strength. Washing the backing rather than the whole row is
          // what makes a text-only item read as finished the way a drained
          // piece of artwork does.
          layout === "LIST" && item.isComplete && "opacity-25 grayscale",
        )}
        style={resolveBackgroundStyle(
          isStage ? (resolvedStage.bgColor ?? item.bgColor) : item.bgColor,
          "rgba(139,92,246,0.08)",
        )}
      />
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Open reference link"
          className={cn(
            "z-20 flex shrink-0 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80",
            layout === "GRID" ? "absolute right-1.5 top-1.5 h-6 w-6 text-xs" : "order-last ml-auto h-5 w-5 text-[10px]",
          )}
        >
          🔗
        </a>
      )}
      {isStage && layout === "GRID" && (
        <span
          className="absolute left-1.5 top-1.5 z-20 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold"
          style={{ color: resolvedStage.borderColor }}
        >
          {resolvedStage.name}
        </span>
      )}
      {layout === "GRID" ? (
        <>
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black/5 p-2 pb-8">
            {item.imageUrl ? (
              <div className="h-full w-full" style={{ transform: `scale(${item.imageScale})` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  style={{
                    imageRendering: item.pixelatedImage ? "pixelated" : "auto",
                    objectFit: item.imageFit === "COVER" ? "cover" : "contain",
                    objectPosition: `${item.imagePositionX}% ${item.imagePositionY}%`,
                  }}
                  className="h-full w-full"
                />
              </div>
            ) : null}
          </div>
          <div
            className={cn(
              "relative z-10 mt-auto flex w-full flex-col gap-1 p-2 pt-8",
              !hasGradientBg && "bg-gradient-to-t from-black/70 to-transparent",
            )}
          >
            <span
              className={cn(
                "block truncate text-center font-bold leading-tight",
                item.isComplete && "line-through",
                fontClassForKey(item.fontFamily),
              )}
              style={{ fontSize: item.textSize ? `${item.textSize}px` : "0.875rem" }}
            >
              {item.title}
            </span>
            {isCounter && (
              <CounterControl item={item} onChange={(value) => onSetCounter(item.id, value)} className="justify-center" />
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
                referrerPolicy="no-referrer"
                style={{ imageRendering: item.pixelatedImage ? "pixelated" : "auto" }}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3
              className={cn("truncate font-bold", item.isComplete && "line-through", fontClassForKey(item.fontFamily))}
              style={{ fontSize: item.textSize ? `${item.textSize}px` : "1rem" }}
            >
              {item.title}
            </h3>
            {item.description && <p className="truncate text-xs opacity-70">{item.description}</p>}
          </div>
          {isCounter && (
            <CounterControl item={item} onChange={(value) => onSetCounter(item.id, value)} className="order-last ml-auto" />
          )}
          {isStage && (
            <span className="order-last ml-auto text-xs font-bold" style={{ color: resolvedStage.borderColor }}>
              {resolvedStage.name}
            </span>
          )}
        </>
      )}
    </div>
  );
}

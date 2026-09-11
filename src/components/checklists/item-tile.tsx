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

// Typing into the counter used to commit only on blur, so a typed value looked
// saved but wasn't until you clicked away. Commit on a short idle instead --
// long enough that typing "150" sends one write rather than three.
const COUNTER_COMMIT_DELAY_MS = 600;

/**
 * Checkbox targets are the one kind with no control of their own, which left
 * them as bare labels -- nothing to aim at, and "done" readable only as a
 * slight dimming. Draw an actual box, in the item's own text color so it works
 * against any background the creator picked.
 */
function CheckMark({ checked, size }: { checked: boolean; size: "sm" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border-2 border-current font-black leading-none",
        size === "sm" ? "h-5 w-5 text-[12px]" : "h-7 w-7 text-base",
        // Unchecked reads as an empty affordance rather than competing with
        // the title for attention.
        !checked && "opacity-35",
      )}
    >
      {checked ? "✓" : ""}
    </span>
  );
}

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
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adopt server-confirmed values (the +/- buttons, or the other player moving
  // the same counter) -- but never mid-edit, which would yank the field out
  // from under whoever is typing in it. Adjusting during render rather than in
  // an effect keeps the stale value from being painted for a frame first.
  if (!focused && item.currentCount !== syncedCount) {
    setSyncedCount(item.currentCount);
    setDraft(String(item.currentCount));
  }

  useEffect(() => {
    return () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    };
  }, []);

  function cancelPending() {
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
      commitTimer.current = null;
    }
  }

  function commitNow(value: number) {
    cancelPending();
    onChange(Math.max(0, value));
  }

  function handleTyping(raw: string) {
    setDraft(raw);
    cancelPending();
    // An empty field is someone mid-edit, not a request to save zero.
    if (raw.trim() === "") return;
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    commitTimer.current = setTimeout(() => {
      commitTimer.current = null;
      onChange(Math.max(0, parsed));
    }, COUNTER_COMMIT_DELAY_MS);
  }

  const step = (delta: number) => commitNow(item.currentCount + delta);

  return (
    <div
      // Clicking the tile bumps a counter by one, so the controls have to stop
      // their own clicks from counting twice.
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "flex items-center gap-0.5 rounded-lg bg-black/30 p-0.5 ring-1 ring-inset ring-white/15",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={item.currentCount <= 0}
        aria-label="Decrease by one"
        className="flex h-6 w-6 items-center justify-center rounded-md text-sm font-black leading-none transition-colors hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        −
      </button>
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
          commitNow(parseInt(e.target.value, 10) || 0);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            cancelPending();
            setDraft(String(item.currentCount));
            e.currentTarget.blur();
          }
        }}
        // Inline rather than classes: globals.css styles bare `input` elements
        // for native form controls, and that would otherwise repaint this one
        // white regardless of the item's own colors.
        style={{ color: "inherit", backgroundColor: "transparent" }}
        className="w-10 border-0 bg-transparent text-center text-xs font-bold tabular-nums outline-none [appearance:textfield] focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Increase by one"
        className="flex h-6 w-6 items-center justify-center rounded-md text-sm font-black leading-none transition-colors hover:bg-white/15"
      >
        +
      </button>
      {item.targetCount != null && (
        <span className="pr-1.5 pl-0.5 text-[11px] font-medium tabular-nums opacity-70">/ {item.targetCount}</span>
      )}
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
  const isCheckbox = !isCounter && !isStage;
  const stageCount = Math.max(1, stages.length);
  const currentStage = Math.min(item.currentCount, stageCount);
  const resolvedStage = resolveStage(stages, currentStage);
  // A dark shading behind the title keeps text legible over a photo or a
  // plain color, but it also muddies a deliberately-chosen gradient
  // background -- so only apply it when there isn't one.
  const hasGradientBg = !!item.bgColor && isGradient(item.bgColor);

  // Every kind now advances on a plain tile click; reaching for the small "+1"
  // control was the only way to move a counter before, which made counters feel
  // unlike every other target.
  function activate() {
    if (isCounter) onSetCounter(item.id, item.currentCount + 1);
    else if (isStage) onSetStage(item.id, (currentStage + 1) % (stageCount + 1));
    else onToggle(item.id);
  }

  return (
    <div
      role={isCheckbox ? "checkbox" : "button"}
      aria-checked={isCheckbox ? item.isComplete : undefined}
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
        // Dimming alone read as "faded", not "finished"; it now only supports
        // the check mark rather than carrying the whole signal, so it can be
        // gentler and leave the item legible.
        item.isComplete && "opacity-60 saturate-[0.6]",
      )}
    >
      {/* Painted on its own layer, bled 1px past the edges -- a background
          sized exactly to the box can leave a hairline gap at the rounded
          corners once `hover:scale` promotes this element to its own
          compositing layer, especially with a diagonal gradient. */}
      <div
        className="absolute -inset-px -z-10"
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
      {/* A grid tile is mostly artwork, so the completed state gets a corner
          badge rather than the always-present box a list row can afford. */}
      {isCheckbox && layout === "GRID" && item.isComplete && (
        <span className="absolute left-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm font-black text-white">
          ✓
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
              <CounterControl item={item} onChange={(value) => onSetCounter(item.id, value)} className="self-center" />
            )}
          </div>
        </>
      ) : (
        <>
          {isCheckbox && <CheckMark checked={item.isComplete} size="sm" />}
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

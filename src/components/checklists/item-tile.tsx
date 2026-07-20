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
  kind: "CHECKBOX" | "COUNTER" | "STAGE";
  targetCount: number | null;
  currentCount: number;
  isComplete: boolean;
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

  return (
    <div
      role={isCounter ? undefined : isStage ? "button" : "checkbox"}
      aria-checked={isCounter || isStage ? undefined : item.isComplete}
      aria-label={isStage ? resolvedStage.name : undefined}
      tabIndex={isCounter ? undefined : 0}
      onClick={
        isCounter
          ? undefined
          : isStage
            ? () => onSetStage(item.id, (currentStage + 1) % (stageCount + 1))
            : () => onToggle(item.id)
      }
      onKeyDown={
        isCounter
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (isStage) onSetStage(item.id, (currentStage + 1) % (stageCount + 1));
                else onToggle(item.id);
              }
            }
      }
      style={{
        borderColor: isStage ? resolvedStage.borderColor : (item.borderColor ?? "transparent"),
        color: isStage ? resolvedStage.textColor : (item.textColor ?? "#ede9fe"),
      }}
      className={cn(
        "relative isolate overflow-hidden rounded-xl border transition-transform focus:outline-none focus:ring-2 focus:ring-neutral-900",
        isCounter ? "" : "cursor-pointer hover:scale-[1.02]",
        layout === "GRID" ? "flex aspect-square flex-col" : "flex items-center gap-3 p-2",
        item.isComplete && "opacity-50 saturate-[0.35]",
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

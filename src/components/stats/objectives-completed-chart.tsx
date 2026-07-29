"use client";

import { useState } from "react";
import { VelocityChart } from "@/components/stats/velocity-chart";
import { cn } from "@/lib/cn";

const SCALES = [30, 90, "All"] as const;
type Scale = (typeof SCALES)[number];

function toCumulative(data: { date: string; completed: number }[]): { date: string; completed: number }[] {
  let running = 0;
  return data.map((d) => {
    running += d.completed;
    return { date: d.date, completed: running };
  });
}

/**
 * `data` is per-day completion counts from the very first completion through
 * today (no fixed lookback), since a checklist can take months and an
 * arbitrary cutoff would either hide most of its history or start well
 * before any real activity happened. This renders it as a running total, and
 * the scale buttons only trim which trailing slice is *shown* -- the
 * cumulative values themselves are always computed over the full history,
 * so zooming in never resets the line back down to 0.
 */
export function ObjectivesCompletedChart({ data }: { data: { date: string; completed: number }[] }) {
  const [scale, setScale] = useState<Scale>("All");
  const cumulative = toCumulative(data);
  const visible = scale === "All" ? cumulative : cumulative.slice(-scale);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-fuchsia-700 dark:text-fuchsia-400">Objectives completed</h3>
        <div className="flex gap-1">
          {SCALES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScale(s)}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-colors",
                scale === s
                  ? "bg-violet-600 text-white"
                  : "text-neutral-500 hover:bg-violet-100 dark:hover:bg-violet-950/40",
              )}
            >
              {s === "All" ? "All" : `${s}d`}
            </button>
          ))}
        </div>
      </div>
      <VelocityChart data={visible} yLabel="objectives completed" />
    </div>
  );
}

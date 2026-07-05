"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export function SliderWithInput({
  value,
  min,
  max,
  step = 1,
  onChange,
  sliderClassName,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  sliderClassName?: string;
}) {
  const [local, setLocal] = useState(value);

  function commit(next: number) {
    if (Number.isNaN(next)) return;
    const clamped = Math.min(max, Math.max(min, next));
    setLocal(clamped);
    onChange(clamped);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={local}
        onChange={(e) => commit(parseFloat(e.target.value))}
        className={cn("w-24", sliderClassName)}
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={local}
        onChange={(e) => commit(parseFloat(e.target.value))}
        className="w-14 rounded border border-neutral-300 px-1 py-0.5 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-violet-100"
      />
    </div>
  );
}

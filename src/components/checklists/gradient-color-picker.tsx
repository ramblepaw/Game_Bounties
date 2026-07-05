"use client";

import { useState } from "react";
import { buildGradient, parseGradient } from "@/lib/background-style";
import { ColorField, type ColorPreset } from "@/components/checklists/color-field";
import { SliderWithInput } from "@/components/checklists/slider-with-input";
import { cn } from "@/lib/cn";

type Mode = "solid" | 2 | 3;

function modeFromValue(value: string | null, fallback: string): { mode: Mode; angle: number; colors: string[] } {
  const parsed = parseGradient(value);
  if (parsed) return { mode: parsed.colors.length >= 3 ? 3 : 2, angle: parsed.angle, colors: parsed.colors };
  return { mode: "solid", angle: 90, colors: [value ?? fallback, fallback] };
}

export function GradientColorPicker({
  value,
  onChange,
  fallback,
  presets,
  onSavePreset,
  onDeletePreset,
}: {
  value: string | null;
  onChange: (value: string) => void;
  fallback: string;
  presets: ColorPreset[];
  onSavePreset: (color: string) => void;
  onDeletePreset: (id: string) => void;
}) {
  const initial = modeFromValue(value, fallback);
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [angle, setAngle] = useState(initial.angle);
  const [colors, setColors] = useState<string[]>(initial.colors);

  function commit(nextMode: Mode, nextAngle: number, nextColors: string[]) {
    if (nextMode === "solid") {
      onChange(nextColors[0]);
    } else {
      onChange(buildGradient(nextAngle, nextColors.slice(0, nextMode)));
    }
  }

  function selectMode(nextMode: Mode) {
    const stopsNeeded = nextMode === "solid" ? 1 : nextMode;
    const nextColors = [...colors];
    while (nextColors.length < stopsNeeded) nextColors.push(fallback);
    setMode(nextMode);
    setColors(nextColors);
    commit(nextMode, angle, nextColors);
  }

  function setColorAt(index: number, color: string) {
    const nextColors = [...colors];
    nextColors[index] = color;
    setColors(nextColors);
    commit(mode, angle, nextColors);
  }

  function setAngleValue(nextAngle: number) {
    setAngle(nextAngle);
    commit(mode, nextAngle, colors);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-800">
        <button
          type="button"
          onClick={() => selectMode("solid")}
          className={cn("rounded py-1 text-xs font-bold", mode === "solid" ? "bg-white shadow" : "text-neutral-500")}
        >
          Solid
        </button>
        <button
          type="button"
          onClick={() => selectMode(2)}
          className={cn("rounded py-1 text-xs font-bold", mode === 2 ? "bg-white shadow" : "text-neutral-500")}
        >
          2-color
        </button>
        <button
          type="button"
          onClick={() => selectMode(3)}
          className={cn("rounded py-1 text-xs font-bold", mode === 3 ? "bg-white shadow" : "text-neutral-500")}
        >
          3-color
        </button>
      </div>

      <div className="flex flex-wrap items-start gap-1.5">
        {colors.slice(0, mode === "solid" ? 1 : mode).map((c, i) => (
          <ColorField
            key={i}
            defaultValue={c}
            onChange={(color) => setColorAt(i, color)}
            presets={presets}
            onSavePreset={onSavePreset}
            onDeletePreset={onDeletePreset}
          />
        ))}
      </div>

      {mode !== "solid" && (
        <div className="flex items-center justify-between">
          <label className="text-xs text-neutral-500">Angle</label>
          <SliderWithInput value={angle} min={0} max={360} onChange={setAngleValue} />
        </div>
      )}
    </div>
  );
}

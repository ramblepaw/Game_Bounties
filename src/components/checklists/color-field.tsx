"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export type ColorPreset = { id: string; name: string; color: string };

/** A color swatch input with a checklist-scoped, named palette of saved presets. */
export function ColorField({
  defaultValue,
  onChange,
  presets,
  onSavePreset,
  onDeletePreset,
  className,
}: {
  defaultValue: string;
  onChange: (value: string) => void;
  presets: ColorPreset[];
  onSavePreset: (color: string) => void;
  onDeletePreset: (id: string) => void;
  className?: string;
}) {
  const [current, setCurrent] = useState(defaultValue);
  const [selectedPresetId, setSelectedPresetId] = useState("");

  function commit(next: string) {
    setCurrent(next);
    onChange(next);
  }

  function applyPreset(id: string) {
    setSelectedPresetId(id);
    const preset = presets.find((p) => p.id === id);
    if (preset) commit(preset.color);
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1">
        <input
          type="color"
          value={current}
          onChange={(e) => commit(e.target.value)}
          className="h-7 w-10 rounded border border-neutral-300"
        />
        <button
          type="button"
          onClick={() => onSavePreset(current)}
          title="Save current color as a named preset"
          className="rounded border border-neutral-300 px-1.5 text-xs text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          +
        </button>
      </div>
      {presets.length > 0 && (
        <div className="flex items-center gap-1">
          <select
            value={selectedPresetId}
            onChange={(e) => applyPreset(e.target.value)}
            className="min-w-0 flex-1 rounded border border-neutral-300 px-1.5 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="" disabled>
              Presets…
            </option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedPresetId}
            onClick={() => {
              onDeletePreset(selectedPresetId);
              setSelectedPresetId("");
            }}
            title="Delete selected preset"
            className="rounded border border-neutral-300 px-1.5 text-xs text-neutral-500 hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

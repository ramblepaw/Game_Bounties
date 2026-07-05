"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const PRESETS_KEY = "gameBounties.colorPresets";
const PRESETS_EVENT = "gameBounties.colorPresetsChanged";
const MAX_PRESETS = 16;

function loadPresets(): string[] {
  try {
    const raw = window.localStorage.getItem(PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePresets(presets: string[]) {
  window.localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  // Every ColorField instance loads its own copy on mount, so other
  // already-mounted instances on the same panel need a nudge to re-sync.
  window.dispatchEvent(new Event(PRESETS_EVENT));
}

/** A color swatch input with a shared, localStorage-backed palette of saved presets. */
export function ColorField({
  defaultValue,
  onChange,
  className,
}: {
  defaultValue: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [presets, setPresets] = useState<string[]>([]);
  const [current, setCurrent] = useState(defaultValue);

  useEffect(() => {
    // Must run post-mount (not a lazy useState initializer) so the server
    // render (no window) and the client's first paint match before presets
    // are synced in from localStorage, avoiding a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPresets(loadPresets());
    function handlePresetsChanged() {
      setPresets(loadPresets());
    }
    window.addEventListener(PRESETS_EVENT, handlePresetsChanged);
    return () => window.removeEventListener(PRESETS_EVENT, handlePresetsChanged);
  }, []);

  function commit(next: string) {
    setCurrent(next);
    onChange(next);
  }

  function addPreset() {
    if (presets.includes(current)) return;
    const next = [current, ...presets].slice(0, MAX_PRESETS);
    setPresets(next);
    savePresets(next);
  }

  function removePreset(hex: string, e: React.MouseEvent) {
    e.stopPropagation();
    const next = presets.filter((p) => p !== hex);
    setPresets(next);
    savePresets(next);
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
          onClick={addPreset}
          title="Save current color as a preset"
          className="rounded border border-neutral-300 px-1.5 text-xs text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          +
        </button>
      </div>
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {presets.map((hex) => (
            <div key={hex} className="group relative">
              <button
                type="button"
                title={hex}
                onClick={() => commit(hex)}
                style={{ backgroundColor: hex }}
                className="h-5 w-5 rounded-sm border border-neutral-300 dark:border-neutral-600"
              />
              <button
                type="button"
                onClick={(e) => removePreset(hex, e)}
                title="Remove preset"
                className="absolute -right-1 -top-1 hidden h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] leading-none text-white group-hover:flex"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTimezone } from "@/server/actions/profile";

export function EditableTimezone({ timezone }: { timezone: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [value, setValue] = useState(timezone);
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [timezone];
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  function commit(next: string) {
    setValue(next);
    startTransition(() => {
      updateTimezone(next).then(() => router.refresh());
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-600 dark:text-violet-300">
      <label className="flex items-center gap-2">
        Timezone
        <select
          value={value}
          onChange={(e) => commit(e.target.value)}
          className="rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 dark:border-violet-800 dark:bg-[#241b35] dark:text-violet-100"
        >
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </label>
      {browserTimezone !== value && (
        <button
          type="button"
          onClick={() => commit(browserTimezone)}
          className="text-xs text-violet-600 hover:underline dark:text-violet-400"
        >
          Use this device&apos;s timezone ({browserTimezone})
        </button>
      )}
    </div>
  );
}

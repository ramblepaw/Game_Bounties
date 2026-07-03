"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateActiveChecklistLimit } from "@/server/actions/profile";
import { DEFAULT_ACTIVE_CHECKLIST_LIMIT } from "@/lib/limits";

export function EditableActiveLimit({ limit }: { limit: number | null }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [value, setValue] = useState(limit?.toString() ?? "");

  function commit() {
    const parsed = value.trim() === "" ? null : Math.max(1, parseInt(value, 10) || 1);
    startTransition(() => {
      updateActiveChecklistLimit(parsed).then(() => router.refresh());
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-violet-300">
      Max checklists you can run at once
      <input
        type="number"
        min={1}
        value={value}
        placeholder={String(DEFAULT_ACTIVE_CHECKLIST_LIMIT)}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        className="w-16 rounded border border-neutral-300 bg-white px-1.5 py-1 text-sm text-neutral-900 dark:border-violet-800 dark:bg-[#241b35] dark:text-violet-100"
      />
    </label>
  );
}

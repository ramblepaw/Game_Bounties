"use client";

import { useActionState } from "react";
import { createManualSession, type ManualEntryState } from "@/server/actions/play-sessions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: ManualEntryState = { error: null };

type ChecklistOption = { id: string; name: string; game: { title: string } };

export function ManualSessionForm({ checklists }: { checklists: ChecklistOption[] }) {
  const [state, formAction, pending] = useActionState(createManualSession, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-violet-300 bg-violet-50 p-4 dark:border-violet-700 dark:bg-violet-950/40"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="checklistId" className="text-xs font-medium text-neutral-700 dark:text-violet-200">
          Checklist
        </label>
        <select
          id="checklistId"
          name="checklistId"
          required
          className="rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900 dark:border-violet-800 dark:bg-[#241b35] dark:text-violet-100"
        >
          {checklists.map((c) => (
            <option key={c.id} value={c.id}>
              {c.game.title} — {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="date" className="text-xs font-medium text-neutral-700 dark:text-violet-200">
          Date
        </label>
        <Input id="date" name="date" type="date" required className="w-40" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="hours" className="text-xs font-medium text-neutral-700 dark:text-violet-200">
          Hours
        </label>
        <Input id="hours" name="hours" type="number" min={0} className="w-20" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="minutes" className="text-xs font-medium text-neutral-700 dark:text-violet-200">
          Minutes
        </label>
        <Input id="minutes" name="minutes" type="number" min={0} max={59} className="w-20" />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="notes" className="text-xs font-medium text-neutral-700 dark:text-violet-200">
          Notes
        </label>
        <Input id="notes" name="notes" className="min-w-[10rem]" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Log session"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

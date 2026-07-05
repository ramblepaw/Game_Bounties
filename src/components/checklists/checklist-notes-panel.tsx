"use client";

import { updateChecklist } from "@/server/actions/checklists";

export function ChecklistNotesPanel({
  checklistId,
  notes,
}: {
  checklistId: string;
  notes: string | null;
}) {
  return (
    <textarea
      key={checklistId}
      defaultValue={notes ?? ""}
      onBlur={(e) => updateChecklist(checklistId, { notes: e.target.value || null })}
      rows={10}
      placeholder="No rules yet — click to add notes."
      className="w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
    />
  );
}

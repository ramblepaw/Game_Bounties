"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSession, deleteSession, stopSession } from "@/server/actions/play-sessions";
import { formatMinutes } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChecklistOption = { id: string; name: string; game: { title: string } };

type SessionRowData = {
  id: string;
  checklistId: string;
  startedAt: Date;
  durationMinutes: number | null;
  notes: string | null;
  user: { displayName: string };
  checklist: { name: string; game: { title: string } };
};

export function SessionRow({
  session,
  checklists,
}: {
  session: SessionRowData;
  checklists: ChecklistOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  function handleSave(formData: FormData) {
    startTransition(async () => {
      const result = await updateSession(session.id, { error: null }, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <tr className="border-b border-neutral-100 dark:border-neutral-800">
        <td colSpan={6} className="py-2">
          <form action={handleSave} className="flex flex-wrap items-end gap-2">
            <select
              name="checklistId"
              defaultValue={session.checklistId}
              className="rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900 dark:border-violet-800 dark:bg-[#241b35] dark:text-violet-100"
            >
              {checklists.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.game.title} — {c.name}
                </option>
              ))}
            </select>
            <Input
              name="date"
              type="date"
              defaultValue={session.startedAt.toISOString().slice(0, 10)}
              required
              className="w-40"
            />
            <Input
              name="hours"
              type="number"
              min={0}
              defaultValue={session.durationMinutes ? Math.floor(session.durationMinutes / 60) : 0}
              className="w-16"
              aria-label="Hours"
            />
            <Input
              name="minutes"
              type="number"
              min={0}
              max={59}
              defaultValue={session.durationMinutes ? session.durationMinutes % 60 : 0}
              className="w-16"
              aria-label="Minutes"
            />
            <Input name="notes" defaultValue={session.notes ?? ""} className="min-w-[8rem] flex-1" />
            <Button type="submit" size="sm" disabled={pending}>
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setError(null);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            {error && <p className="w-full text-sm text-red-600">{error}</p>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-neutral-100 dark:border-neutral-800">
      <td className="py-2">
        {session.checklist.game.title} — {session.checklist.name}
      </td>
      <td className="py-2">{session.user.displayName}</td>
      <td className="py-2">{session.startedAt.toLocaleDateString()}</td>
      <td className="py-2">
        {session.durationMinutes != null ? formatMinutes(session.durationMinutes) : "in progress"}
      </td>
      <td className="py-2 text-neutral-500">{session.notes}</td>
      <td className="py-2 text-right">
        <div className="flex justify-end gap-2">
          {session.durationMinutes == null && (
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => stopSession(session.id).then(refresh))}
              className="text-xs text-violet-600 hover:text-violet-800"
            >
              Stop now
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => deleteSession(session.id).then(refresh))}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

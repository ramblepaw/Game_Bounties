"use client";

import { useActionState } from "react";
import { createChecklist, type ChecklistFormState } from "@/server/actions/checklists";
import { DEFAULT_TOKENS_PER_COMPLETION } from "@/lib/token-economy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: ChecklistFormState = { error: null };

export function NewChecklistForm({ gameId }: { gameId: string }) {
  const action = createChecklist.bind(null, gameId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <Input id="name" name="name" placeholder="Living Dex, Main Story…" required autoFocus />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="tokenReward" className="text-sm font-medium">
          Token reward
        </label>
        <Input
          id="tokenReward"
          name="tokenReward"
          type="number"
          min={0}
          placeholder={String(DEFAULT_TOKENS_PER_COMPLETION)}
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create checklist"}
      </Button>
    </form>
  );
}

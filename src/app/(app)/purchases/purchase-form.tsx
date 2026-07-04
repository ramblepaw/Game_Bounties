"use client";

import { useActionState } from "react";
import { createPurchase, type PurchaseFormState } from "@/server/actions/game-purchases";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: PurchaseFormState = { error: null };

export function PurchaseForm() {
  const [state, formAction, pending] = useActionState(createPurchase, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-violet-300 bg-violet-50 p-4 dark:border-violet-700 dark:bg-violet-950/40"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-xs font-medium text-neutral-700 dark:text-violet-200">
          Game title
        </label>
        <Input id="title" name="title" placeholder="What did you buy?" required className="w-48" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="tokenCost" className="text-xs font-medium text-neutral-700 dark:text-violet-200">
          Tokens spent
        </label>
        <Input id="tokenCost" name="tokenCost" type="number" min={0} required className="w-24" />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="notes" className="text-xs font-medium text-neutral-700 dark:text-violet-200">
          Notes
        </label>
        <Input id="notes" name="notes" className="min-w-[10rem]" placeholder="Sale, edition, etc." />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Logging…" : "Log purchase"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

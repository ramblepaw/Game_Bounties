"use client";

import { useActionState } from "react";
import { adjustTokens, type AdjustmentFormState } from "@/server/actions/token-adjustments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AdjustmentFormState = { error: null, success: null };

export function TokenAdjustmentForm() {
  const [state, formAction, pending] = useActionState(adjustTokens, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 dark:border-amber-700/60 dark:bg-amber-950/20"
    >
      <div className="flex w-full flex-col gap-1">
        <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Adjust balance</p>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          For tokens the app can&apos;t work out on its own — carrying over an existing balance, or a
          house rule like a second player&apos;s completion being worth more. Positive adds, negative
          removes.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="amount" className="text-xs font-medium text-neutral-700 dark:text-violet-200">
          Tokens
        </label>
        {/* No `min`: removing tokens is as valid as adding them. */}
        <Input id="amount" name="amount" type="number" step={1} required placeholder="e.g. 25" className="w-28" />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="reason" className="text-xs font-medium text-neutral-700 dark:text-violet-200">
          Reason
        </label>
        <Input
          id="reason"
          name="reason"
          required
          className="min-w-[12rem]"
          placeholder="Franchise bonus, carried-over balance, correction…"
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Applying…" : "Apply adjustment"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="w-full text-sm text-emerald-600 dark:text-emerald-400">{state.success}</p>}
    </form>
  );
}

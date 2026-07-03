"use client";

import { useActionState } from "react";
import { submitForApproval, type SubmitState } from "@/server/actions/completions";
import { Button } from "@/components/ui/button";

const initialState: SubmitState = { error: null };

export function SubmitApprovalForm({ checklistId, label }: { checklistId: string; label: string }) {
  const action = submitForApproval.bind(null, checklistId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : label}
      </Button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

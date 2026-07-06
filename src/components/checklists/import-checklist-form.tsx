"use client";

import { useActionState, useRef } from "react";
import { importChecklist, type ImportChecklistFormState } from "@/server/actions/checklists";
import { Button } from "@/components/ui/button";

const initialState: ImportChecklistFormState = { error: null };

export function ImportChecklistForm({ gameId }: { gameId: string }) {
  const action = importChecklist.bind(null, gameId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        name="file"
        accept="application/json"
        className="hidden"
        onChange={() => formRef.current?.requestSubmit()}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() => fileInputRef.current?.click()}
      >
        {pending ? "Importing…" : "Import checklist"}
      </Button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

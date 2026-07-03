"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { startSession, stopSession, type SessionActionState } from "@/server/actions/play-sessions";
import { Button } from "@/components/ui/button";

const initialState: SessionActionState = { error: null };

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
}

export function SessionTimer({
  checklistId,
  activeSession,
}: {
  checklistId: string;
  activeSession: { id: string; checklistId: string; startedAt: Date; checklistName: string } | null;
}) {
  const router = useRouter();
  const action = startSession.bind(null, checklistId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [now, setNow] = useState(() => Date.now());

  const isThisChecklist = activeSession?.checklistId === checklistId;

  useEffect(() => {
    if (!isThisChecklist) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isThisChecklist]);

  if (isThisChecklist && activeSession) {
    const elapsed = now - new Date(activeSession.startedAt).getTime();
    return (
      <div className="flex items-center gap-3 rounded-md bg-violet-100 px-3 py-2 dark:bg-violet-950/40">
        <span className="font-mono text-sm text-violet-900 dark:text-violet-200">{formatElapsed(elapsed)}</span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => stopSession(activeSession.id).then(() => router.refresh())}
        >
          Stop session
        </Button>
      </div>
    );
  }

  if (activeSession) {
    return (
      <p className="text-sm text-neutral-500">
        Active session running on {activeSession.checklistName}. Stop it before starting a new one.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Starting…" : "Start session"}
      </Button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

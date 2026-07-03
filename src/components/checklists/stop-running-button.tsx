"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deactivateChecklist } from "@/server/actions/active-checklists";

export function StopRunningButton({ checklistId }: { checklistId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("Stop running? All progress on this checklist will be erased.")) return;
    startTransition(() => deactivateChecklist(checklistId).then(() => router.refresh()));
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className="text-xs text-neutral-500 hover:text-red-600"
    >
      Stop running this checklist
    </button>
  );
}

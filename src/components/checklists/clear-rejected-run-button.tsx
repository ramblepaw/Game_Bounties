"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearRejectedRun } from "@/server/actions/completions";

export function ClearRejectedRunButton({ completionId }: { completionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("Clear all progress and start this checklist over?")) return;
    startTransition(() => clearRejectedRun(completionId).then(() => router.refresh()));
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-300"
    >
      Clear and restart
    </button>
  );
}

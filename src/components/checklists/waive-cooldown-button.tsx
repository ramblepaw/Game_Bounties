"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { waiveCooldown } from "@/server/actions/completions";

export function WaiveCooldownButton({ completionId }: { completionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => waiveCooldown(completionId).then(() => router.refresh()))}
      className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-300"
    >
      Waive cooldown
    </button>
  );
}

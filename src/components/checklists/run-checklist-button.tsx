"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { activateChecklist } from "@/server/actions/active-checklists";
import { Button } from "@/components/ui/button";

export function RunChecklistButton({
  checklistId,
  href,
  isActive,
}: {
  checklistId: string;
  href: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (isActive) {
      router.push(href);
      return;
    }
    startTransition(async () => {
      const result = await activateChecklist(checklistId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(href);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" onClick={handleClick} disabled={pending}>
        {isActive ? "▶ Continue" : "▶ Run"}
      </Button>
      {error && <p className="max-w-[10rem] text-xs text-red-600">{error}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { approveCompletion, rejectCompletion } from "@/server/actions/completions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ApprovalCard({
  completionId,
  gameTitle,
  checklistName,
  runHref,
  completedByName,
  submittedOn,
}: {
  completionId: string;
  gameTitle: string;
  checklistName: string;
  /**
   * The submitter's run -- not the checklist page, which shows whoever is
   * looking at it their own board. Omitted when the card is already on the run.
   */
  runHref?: string;
  completedByName: string;
  /** Already formatted in the viewer's timezone, so it matches the run's own dates and charts. */
  submittedOn: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/40">
      <div>
        <p className="font-medium text-violet-950 dark:text-violet-100">
          {gameTitle} — {checklistName}
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Completed by {completedByName} on {submittedOn}
        </p>
        {runHref && (
          <Link href={runHref} className="text-sm text-violet-600 underline">
            View {completedByName}&apos;s run
          </Link>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {showReject ? (
        <div className="flex flex-col gap-2">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
          />
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              disabled={isPending}
              onClick={() => {
                rejectCompletion(completionId, reason)
                  .then(refresh)
                  .catch((err) => setError(err.message));
              }}
            >
              Confirm reject
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowReject(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => {
              approveCompletion(completionId)
                .then(refresh)
                .catch((err) => setError(err.message));
            }}
          >
            Approve
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowReject(true)}>
            Reject
          </Button>
        </div>
      )}
    </li>
  );
}

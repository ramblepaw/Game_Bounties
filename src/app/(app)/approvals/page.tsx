import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listPendingApprovalsFor } from "@/server/queries/approvals";
import { ApprovalCard } from "@/components/approvals/approval-card";

export default async function ApprovalsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const pending = await listPendingApprovalsFor(session.userId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold text-violet-950 dark:text-violet-100">Pending approvals</h1>
      {pending.length === 0 ? (
        <p className="text-neutral-500">Nothing waiting on your review.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((completion) => (
            <ApprovalCard
              key={completion.id}
              completionId={completion.id}
              gameTitle={completion.checklist.game.title}
              checklistName={completion.checklist.name}
              checklistHref={`/games/${completion.checklist.gameId}/checklists/${completion.checklistId}`}
              completedByName={completion.completedBy.displayName}
              submittedAt={completion.submittedAt}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

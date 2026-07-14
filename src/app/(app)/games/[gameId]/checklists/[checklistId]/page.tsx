import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getChecklistDetail, checklistProgress } from "@/server/queries/games";
import { computeChecklistProgress, flattenProgressItems } from "@/lib/checklist-progress";
import { asStages } from "@/lib/stages";
import { fetchItemProgressMap, withItemProgress } from "@/server/queries/item-progress";
import {
  getActiveSessionFor,
  totalPlaytimeMinutesForChecklist,
  sessionCountForChecklist,
  listSessionsForChecklist,
  playtimeByDayForChecklist,
} from "@/server/queries/sessions";
import { listActiveChecklistIdsFor } from "@/server/queries/active-checklists";
import { estimateCompletionDate } from "@/lib/estimation";
import { DEFAULT_TOKENS_PER_COMPLETION } from "@/lib/token-economy";
import { getSession } from "@/lib/auth";
import { ChecklistProgressView } from "@/components/checklists/checklist-progress-view";
import { ChecklistStatsPanel } from "@/components/checklists/checklist-stats-panel";
import { ChecklistNotesPanel } from "@/components/checklists/checklist-notes-panel";
import { ChecklistViewTabs } from "@/components/checklists/checklist-view-tabs";
import { SubmitApprovalForm } from "@/components/checklists/submit-approval-form";
import { SessionTimer } from "@/components/sessions/session-timer";
import { StopRunningButton } from "@/components/checklists/stop-running-button";
import { ClearRejectedRunButton } from "@/components/checklists/clear-rejected-run-button";

export default async function ChecklistProgressPage({
  params,
}: {
  params: Promise<{ gameId: string; checklistId: string }>;
}) {
  const { gameId, checklistId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const checklist = await getChecklistDetail(checklistId);
  if (!checklist) notFound();

  const [activeSession, activeIds, totalMinutes, sessionCount, estimate, sessions, playtimeByDay] =
    await Promise.all([
      getActiveSessionFor(session.userId),
      listActiveChecklistIdsFor(session.userId),
      totalPlaytimeMinutesForChecklist(checklistId, session.userId),
      sessionCountForChecklist(checklistId, session.userId),
      estimateCompletionDate(checklistId, session.userId),
      listSessionsForChecklist(checklistId, session.userId),
      playtimeByDayForChecklist(checklistId, session.userId),
    ]);

  const itemIds = checklist.tabs.flatMap((t) => t.sections.flatMap((s) => s.items.map((i) => i.id)));
  const itemProgress = await fetchItemProgressMap(session.userId, itemIds);
  const progressTabs = checklist.tabs.map((tab) => ({
    ...tab,
    sections: tab.sections.map((section) => ({
      ...section,
      stages: asStages(section.stages),
      items: withItemProgress(section.items, itemProgress),
    })),
  }));

  const progress = checklistProgress({ tabs: progressTabs });
  const tabProgress = progressTabs.map((tab) => ({
    tab: tab.title,
    percent: computeChecklistProgress(
      flattenProgressItems(tab.sections.map((s) => ({ stageCount: asStages(s.stages).length, items: s.items }))),
    ).percent,
  }));
  const latestCompletion = checklist.completions[0];
  const isRunning = activeIds.has(checklistId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/games/${gameId}`}
          className="min-w-0 truncate text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← Back to {checklist.game.title}
        </Link>
        <Link
          href={`/games/${gameId}/checklists/${checklistId}/edit`}
          className="shrink-0 text-sm text-neutral-500 hover:text-neutral-900"
        >
          Edit checklist
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="truncate text-lg font-bold text-violet-950 dark:text-violet-100">{checklist.name}</h1>
          {isRunning && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Running
            </span>
          )}
        </div>
        {checklist.description && (
          <p className="text-sm text-neutral-600 dark:text-neutral-300">{checklist.description}</p>
        )}
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
          Approving this checklist awards 🪙 {checklist.tokenReward ?? DEFAULT_TOKENS_PER_COMPLETION}
        </p>
      </div>

      {isRunning && (
        <div className="flex flex-wrap items-center gap-3">
          <SessionTimer
            checklistId={checklistId}
            activeSession={
              activeSession
                ? {
                    id: activeSession.id,
                    checklistId: activeSession.checklistId,
                    startedAt: activeSession.startedAt,
                    checklistName: activeSession.checklist.name,
                  }
                : null
            }
          />
          <StopRunningButton checklistId={checklistId} />
        </div>
      )}

      {latestCompletion && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          <span>
            {latestCompletion.status === "PENDING" &&
              `Submitted for approval by ${latestCompletion.completedBy.displayName}, awaiting review.`}
            {latestCompletion.status === "REJECTED" &&
              `Last submission was rejected${
                latestCompletion.rejectionReason ? `: ${latestCompletion.rejectionReason}` : "."
              }`}
            {latestCompletion.status === "APPROVED" &&
              `Approved by ${latestCompletion.reviewedBy?.displayName ?? "the household"}.`}
          </span>
          {latestCompletion.status === "REJECTED" && (
            <ClearRejectedRunButton completionId={latestCompletion.id} />
          )}
        </div>
      )}

      {progress.total > 0 &&
        progress.completed === progress.total &&
        latestCompletion?.status !== "PENDING" && (
          <SubmitApprovalForm
            checklistId={checklistId}
            label={latestCompletion?.status === "REJECTED" ? "Resubmit for approval" : "Submit for approval"}
          />
        )}

      <ChecklistViewTabs
        checklistSlot={<ChecklistProgressView tabs={progressTabs} />}
        notesSlot={<ChecklistNotesPanel notesModules={checklist.notesModules} />}
        statsSlot={
          <ChecklistStatsPanel
            checklistId={checklistId}
            checklistName={checklist.name}
            gameTitle={checklist.game.title}
            totalMinutes={totalMinutes}
            sessionCount={sessionCount}
            progress={progress}
            estimate={estimate}
            sessions={sessions}
            tabProgress={tabProgress}
            playtimeByDay={playtimeByDay}
          />
        }
      />
    </div>
  );
}

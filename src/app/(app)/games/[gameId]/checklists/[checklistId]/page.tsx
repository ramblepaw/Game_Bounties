import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getChecklistDetail } from "@/server/queries/games";
import { fetchItemProgressMap, completedByDayForChecklist } from "@/server/queries/item-progress";
import { currentRunFor, latestSubmissionFor } from "@/lib/runs";
import { runHref } from "@/lib/run-links";
import { buildBoard } from "@/lib/checklist-board";
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
import { formatShortDate, formatPercent } from "@/lib/format";
import { DEFAULT_TIMEZONE, formatShortDateIn } from "@/lib/timezone";
import { getSession, getCurrentUser } from "@/lib/auth";
import { ProgressBar } from "@/components/checklists/progress-bar";
import { ChecklistProgressView } from "@/components/checklists/checklist-progress-view";
import { ChecklistStatsPanel } from "@/components/checklists/checklist-stats-panel";
import { ChecklistNotesPanel } from "@/components/checklists/checklist-notes-panel";
import { ChecklistRequiredGamesPanel } from "@/components/checklists/checklist-required-games-panel";
import { ChecklistBoxesPanel } from "@/components/checklists/checklist-boxes-panel";
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

  const [checklist, currentUser] = await Promise.all([getChecklistDetail(checklistId), getCurrentUser()]);
  if (!checklist) notFound();
  const timeZone = currentUser?.timezone ?? DEFAULT_TIMEZONE;

  // Everything on this page is the viewer's current run only. A finished run
  // lives on its own page (runs/[completionId]) with its figures frozen at
  // submission, so it neither keeps "recording" nor merges into a re-run.
  const [run, latestCompletion] = await Promise.all([
    currentRunFor(checklistId, session.userId),
    latestSubmissionFor(checklistId, session.userId),
  ]);
  const { window } = run;
  const isSubmitted = run.pending !== null;

  const [activeSession, activeIds, totalMinutes, sessionCount, estimate, sessions, playtimeByDay, completedByDay] =
    await Promise.all([
      getActiveSessionFor(session.userId),
      listActiveChecklistIdsFor(session.userId),
      totalPlaytimeMinutesForChecklist(checklistId, session.userId, window),
      sessionCountForChecklist(checklistId, session.userId, window),
      estimateCompletionDate(checklistId, session.userId, timeZone, window),
      listSessionsForChecklist(checklistId, session.userId, window),
      playtimeByDayForChecklist(checklistId, session.userId, timeZone, window),
      completedByDayForChecklist(checklistId, session.userId, timeZone, window),
    ]);

  const itemIds = checklist.tabs.flatMap((t) => t.sections.flatMap((s) => s.items.map((i) => i.id)));
  const itemProgress = await fetchItemProgressMap(session.userId, itemIds);
  const { progressTabs, boxItems, tabProgress, progress } = buildBoard(checklist.tabs, (item) =>
    itemProgress.get(item.id),
  );
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

      {isRunning && !isSubmitted && (
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
              `Completed ${formatShortDateIn(latestCompletion.submittedAt, timeZone)} and submitted for approval — this run is finished.`}
            {latestCompletion.status === "REJECTED" &&
              `Last submission was rejected${
                latestCompletion.rejectionReason ? `: ${latestCompletion.rejectionReason}` : "."
              }`}
            {latestCompletion.status === "APPROVED" &&
              `Last completed ${formatShortDateIn(latestCompletion.submittedAt, timeZone)}, approved by ${
                latestCompletion.reviewedBy?.displayName ?? "the household"
              }.`}
          </span>
          {latestCompletion.status === "REJECTED" ? (
            <ClearRejectedRunButton completionId={latestCompletion.id} />
          ) : (
            <Link
              href={runHref(gameId, checklistId, latestCompletion.id)}
              className="shrink-0 text-violet-600 hover:underline dark:text-violet-300"
            >
              View run
            </Link>
          )}
        </div>
      )}

      {progress.total > 0 &&
        progress.completed === progress.total &&
        !isSubmitted && (
          <SubmitApprovalForm
            checklistId={checklistId}
            label={latestCompletion?.status === "REJECTED" ? "Resubmit for approval" : "Submit for approval"}
          />
        )}

      <div className="flex flex-col gap-2">
        <ProgressBar percent={progress.percent} />
        <p className="text-xs text-neutral-500">
          {progress.completed} / {progress.total} complete ({formatPercent(progress.percent)})
        </p>
        <p className="text-xs text-neutral-500">
          {estimate.projectedDate
            ? `Estimated completion: ${formatShortDate(estimate.projectedDate)}`
            : "Not enough progress history yet to estimate a completion date."}
        </p>
      </div>

      <ChecklistViewTabs
        checklistSlot={<ChecklistProgressView tabs={progressTabs} readOnly={isSubmitted} />}
        notesSlot={<ChecklistNotesPanel notesModules={checklist.notesModules} />}
        gamesSlot={<ChecklistRequiredGamesPanel requiredGames={checklist.requiredGames} />}
        boxesSlot={
          checklist.boxSize ? <ChecklistBoxesPanel items={boxItems} boxSize={checklist.boxSize} /> : undefined
        }
        statsSlot={
          <ChecklistStatsPanel
            checklistId={checklistId}
            checklistName={checklist.name}
            gameTitle={checklist.game.title}
            timeZone={timeZone}
            totalMinutes={totalMinutes}
            sessionCount={sessionCount}
            progress={progress}
            sessions={sessions}
            tabProgress={tabProgress}
            playtimeByDay={playtimeByDay}
            completedByDay={completedByDay}
            readOnly={isSubmitted}
          />
        }
      />
    </div>
  );
}

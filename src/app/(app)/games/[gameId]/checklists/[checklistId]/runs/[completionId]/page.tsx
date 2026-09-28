import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getChecklistDetail } from "@/server/queries/games";
import { fetchItemProgressMap, completedByDayForChecklist } from "@/server/queries/item-progress";
import {
  totalPlaytimeMinutesForChecklist,
  sessionCountForChecklist,
  listSessionsForChecklist,
  playtimeByDayForChecklist,
} from "@/server/queries/sessions";
import { getRun } from "@/lib/runs";
import { buildBoard, finishedProgress, asOfSubmission } from "@/lib/checklist-board";
import { DEFAULT_TIMEZONE, formatShortDateIn } from "@/lib/timezone";
import { getSession, getCurrentUser } from "@/lib/auth";
import { ProgressBar } from "@/components/checklists/progress-bar";
import { ChecklistProgressView } from "@/components/checklists/checklist-progress-view";
import { ChecklistStatsPanel } from "@/components/checklists/checklist-stats-panel";
import { ChecklistNotesPanel } from "@/components/checklists/checklist-notes-panel";
import { ChecklistRequiredGamesPanel } from "@/components/checklists/checklist-required-games-panel";
import { ChecklistBoxesPanel } from "@/components/checklists/checklist-boxes-panel";
import { ChecklistViewTabs } from "@/components/checklists/checklist-view-tabs";
import { ApprovalCard } from "@/components/approvals/approval-card";
import { BadgeIcon } from "@/components/badges/badge-icon";

/**
 * One submitted run, as it was when its player finished it -- the archive of
 * an approved run, or what a reviewer looks at before approving one.
 *
 * Everything is the *player's* run, never the viewer's own board: the
 * reviewer is by definition someone else, and the checklist page shows
 * whoever is looking at it their own progress.
 */
export default async function RunPage({
  params,
}: {
  params: Promise<{ gameId: string; checklistId: string; completionId: string }>;
}) {
  const { gameId, checklistId, completionId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const [run, checklist, currentUser] = await Promise.all([
    getRun(completionId),
    getChecklistDetail(checklistId),
    getCurrentUser(),
  ]);
  if (!run || !checklist || run.completion.checklistId !== checklistId) notFound();
  const { completion, window } = run;
  const player = completion.completedBy;
  const isPending = completion.status === "PENDING";
  const timeZone = currentUser?.timezone ?? DEFAULT_TIMEZONE;

  // The board as it was at submission. While a run awaits review its rows are
  // still there and locked, so they are exactly what was submitted. Approval
  // clears them, but submission requires every item complete, so an approved
  // run's board is known without them.
  const tabs = asOfSubmission(checklist.tabs, completion.submittedAt);
  const itemIds = tabs.flatMap((t) => t.sections.flatMap((s) => s.items.map((i) => i.id)));
  const liveProgress = isPending ? await fetchItemProgressMap(player.id, itemIds) : null;
  const { progressTabs, boxItems, tabProgress, progress } = buildBoard(tabs, (item, stageCount) =>
    liveProgress ? liveProgress.get(item.id) : finishedProgress(item, stageCount, completion.submittedAt),
  );

  const [totalMinutes, sessionCount, sessions, playtimeByDay, completedByDay] = await Promise.all([
    totalPlaytimeMinutesForChecklist(checklistId, player.id, window),
    sessionCountForChecklist(checklistId, player.id, window),
    listSessionsForChecklist(checklistId, player.id, window),
    playtimeByDayForChecklist(checklistId, player.id, timeZone, window),
    completedByDayForChecklist(checklistId, player.id, timeZone, window),
  ]);

  const badge = completion.userBadge?.badge;
  const isReviewer = isPending && player.id !== session.userId;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/games/${gameId}/checklists/${checklistId}`}
        className="min-w-0 truncate text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← Back to {checklist.name}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-violet-950 dark:text-violet-100">
            {checklist.game.title} — {checklist.name}
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            {player.displayName}&apos;s run · completed {formatShortDateIn(completion.submittedAt, timeZone)}
          </p>
          <p className="text-xs text-neutral-500">
            {isPending
              ? "Awaiting approval."
              : `Approved by ${completion.reviewedBy?.displayName ?? "the household"}${
                  completion.reviewedAt ? ` on ${formatShortDateIn(completion.reviewedAt, timeZone)}` : ""
                }${completion.tokenTransaction ? ` · earned 🪙 ${completion.tokenTransaction.amount}` : ""}.`}
          </p>
        </div>
        {badge && (
          <BadgeIcon
            name={badge.name}
            iconUrl={badge.iconUrl}
            completedOn={formatShortDateIn(completion.submittedAt, timeZone)}
          />
        )}
      </div>

      {isReviewer && (
        <ul>
          <ApprovalCard
            completionId={completion.id}
            gameTitle={checklist.game.title}
            checklistName={checklist.name}
            completedByName={player.displayName}
            submittedOn={formatShortDateIn(completion.submittedAt, timeZone)}
          />
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <ProgressBar percent={progress.percent} />
        <p className="text-xs text-neutral-500">
          {progress.completed} / {progress.total} complete ({progress.percent}%)
        </p>
      </div>

      <ChecklistViewTabs
        checklistSlot={<ChecklistProgressView tabs={progressTabs} readOnly />}
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
            readOnly
            playerName={player.id === session.userId ? undefined : player.displayName}
          />
        }
      />
    </div>
  );
}

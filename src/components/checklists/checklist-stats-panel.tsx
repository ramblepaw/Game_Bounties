import { formatMinutes } from "@/lib/format";
import type { CompletionEstimate } from "@/lib/estimation";
import { ProgressBar } from "@/components/checklists/progress-bar";
import { TabCompletionTable } from "@/components/stats/tab-completion-table";
import { ChecklistPlaytimeChart } from "@/components/stats/checklist-playtime-chart";
import { ObjectivesCompletedChart } from "@/components/stats/objectives-completed-chart";
import { SessionRow } from "@/app/(app)/sessions/session-row";

type StatsSession = {
  id: string;
  checklistId: string;
  startedAt: Date;
  durationMinutes: number | null;
  notes: string | null;
  user: { displayName: string };
  checklist: { name: string; game: { title: string } };
};

export function ChecklistStatsPanel({
  checklistId,
  checklistName,
  gameTitle,
  totalMinutes,
  sessionCount,
  progress,
  estimate,
  sessions,
  tabProgress,
  playtimeByDay,
  completedByDay,
}: {
  checklistId: string;
  checklistName: string;
  gameTitle: string;
  totalMinutes: number;
  sessionCount: number;
  progress: { completed: number; total: number; percent: number };
  estimate: CompletionEstimate;
  sessions: StatsSession[];
  tabProgress: { tab: string; percent: number }[];
  playtimeByDay: { date: string; minutes: number }[];
  completedByDay: { date: string; completed: number }[];
}) {
  const checklists = [{ id: checklistId, name: checklistName, game: { title: gameTitle } }];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3 rounded-lg border border-violet-200 bg-violet-50 p-3 text-center dark:border-violet-800 dark:bg-violet-950/40">
        <div>
          <p className="text-lg font-bold text-violet-900 dark:text-violet-200">{formatMinutes(totalMinutes)}</p>
          <p className="text-xs text-neutral-500">Your playtime</p>
        </div>
        <div>
          <p className="text-lg font-bold text-violet-900 dark:text-violet-200">{sessionCount}</p>
          <p className="text-xs text-neutral-500">Your sessions</p>
        </div>
        <div>
          <p className="text-lg font-bold text-violet-900 dark:text-violet-200">{progress.percent}%</p>
          <p className="text-xs text-neutral-500">Your completion</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <ProgressBar percent={progress.percent} />
        <p className="text-xs text-neutral-500">
          {progress.completed} / {progress.total} complete ({progress.percent}%)
        </p>
        <p className="text-xs text-neutral-500">
          {estimate.projectedDate
            ? `Estimated completion: ${estimate.projectedDate.toLocaleDateString()}`
            : "Not enough progress history yet to estimate a completion date."}
        </p>
      </div>

      {tabProgress.length > 1 && (
        <div>
          <h3 className="mb-2 font-medium text-fuchsia-700 dark:text-fuchsia-400">Completion by tab</h3>
          <TabCompletionTable rates={tabProgress} />
        </div>
      )}

      <ObjectivesCompletedChart data={completedByDay} />

      <div>
        <h3 className="mb-2 font-medium text-fuchsia-700 dark:text-fuchsia-400">Your playtime</h3>
        <ChecklistPlaytimeChart data={playtimeByDay} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 font-medium text-fuchsia-700 dark:text-fuchsia-400">Your session log</h3>
          {sessions.length === 0 ? (
            <p className="text-sm text-neutral-500">No sessions logged for this checklist yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-violet-200 text-neutral-500 dark:border-violet-800">
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Duration</th>
                  <th className="py-2 font-medium">Notes</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <SessionRow key={s.id} session={s} checklists={checklists} showPlayer={false} showChecklist={false} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-medium text-fuchsia-700 dark:text-fuchsia-400">Completed per day</h3>
            {estimate.velocityPerDay != null && (
              <span className="whitespace-nowrap text-xs text-neutral-500">
                Current average: <span className="font-semibold text-violet-900 dark:text-violet-200">{estimate.velocityPerDay.toFixed(2)}</span>/day
              </span>
            )}
          </div>
          {completedByDay.every((d) => d.completed === 0) ? (
            <p className="text-sm text-neutral-500">No completions logged yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-violet-200 text-neutral-500 dark:border-violet-800">
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody>
                {completedByDay
                  .filter((d) => d.completed > 0)
                  .reverse()
                  .map((d) => {
                    // `d.date` is a plain "yyyy-MM-dd" string -- parsing it directly
                    // with `new Date()` reads it as UTC midnight, which can display
                    // as the wrong day once converted to the browser's local time.
                    const [year, month, day] = d.date.split("-").map(Number);
                    return (
                      <tr key={d.date} className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="py-2">{new Date(year, month - 1, day).toLocaleDateString()}</td>
                        <td className="py-2">{d.completed}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

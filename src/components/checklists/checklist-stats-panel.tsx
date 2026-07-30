import { addDays } from "date-fns";
import { formatMinutes, parseISODateLocal, formatShortDate } from "@/lib/format";
import { zonedDateKey } from "@/lib/timezone";
import { TabCompletionTable } from "@/components/stats/tab-completion-table";
import { ChecklistPlaytimeChart } from "@/components/stats/checklist-playtime-chart";
import { ObjectivesCompletedChart } from "@/components/stats/objectives-completed-chart";
import { CollapsibleSection } from "@/components/checklists/collapsible-section";
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

function cumulativeSums(values: number[]): number[] {
  const sums: number[] = [];
  values.reduce((running, v, i) => {
    const next = running + v;
    sums[i] = next;
    return next;
  }, 0);
  return sums;
}

export function ChecklistStatsPanel({
  checklistId,
  checklistName,
  gameTitle,
  timeZone,
  totalMinutes,
  sessionCount,
  progress,
  sessions,
  tabProgress,
  playtimeByDay,
  completedByDay,
}: {
  checklistId: string;
  checklistName: string;
  gameTitle: string;
  timeZone: string;
  totalMinutes: number;
  sessionCount: number;
  progress: { completed: number; total: number; percent: number };
  sessions: StatsSession[];
  tabProgress: { tab: string; percent: number }[];
  playtimeByDay: { date: string; minutes: number }[];
  completedByDay: { date: string; completed: number }[];
}) {
  const checklists = [{ id: checklistId, name: checklistName, game: { title: gameTitle } }];

  // Running average minutes/day as of each date, keyed for session-row lookup.
  const minutesCumulative = cumulativeSums(playtimeByDay.map((d) => d.minutes));
  const playtimeAvgByDate = new Map<string, number>(
    playtimeByDay.map((d, index) => [d.date, minutesCumulative[index] / (index + 1)]),
  );
  const avgPlaytimePerDay = playtimeByDay.length > 0 ? totalMinutes / playtimeByDay.length : null;

  // Same running-average idea for objectives, plus what the projected
  // completion date would have been as of that day (same math as
  // estimateCompletionDate, just recomputed at each historical point).
  const completedCumulative = cumulativeSums(completedByDay.map((d) => d.completed));
  const completedRows = completedByDay.map((d, index) => {
    const dayIndex = index + 1;
    const cumulative = completedCumulative[index];
    const average = cumulative / dayIndex;
    const remaining = progress.total - cumulative;
    const rowDate = parseISODateLocal(d.date);
    const estDate = remaining > 0 && average > 0 ? addDays(rowDate, Math.ceil(remaining / average)) : null;
    return { date: d.date, completed: d.completed, average, estDate };
  });
  const currentAverage = completedRows.length > 0 ? completedRows[completedRows.length - 1].average : null;

  return (
    <div className="flex flex-col gap-4">
      <CollapsibleSection title="Overview">
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
      </CollapsibleSection>

      {tabProgress.length > 1 && (
        <CollapsibleSection title="Completion by tab">
          <TabCompletionTable rates={tabProgress} />
        </CollapsibleSection>
      )}

      <ObjectivesCompletedChart data={completedByDay} />

      <CollapsibleSection
        title="Your playtime"
        headerExtra={
          avgPlaytimePerDay != null && (
            <span className="whitespace-nowrap text-xs text-neutral-500">
              Average: <span className="font-semibold text-violet-900 dark:text-violet-200">{formatMinutes(Math.round(avgPlaytimePerDay))}</span>/day
            </span>
          )
        }
      >
        <ChecklistPlaytimeChart data={playtimeByDay} />
      </CollapsibleSection>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CollapsibleSection title="Your session log">
          {sessions.length === 0 ? (
            <p className="text-sm text-neutral-500">No sessions logged for this checklist yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-violet-200 text-neutral-500 dark:border-violet-800">
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Duration</th>
                  <th className="py-2 font-medium">Average</th>
                  <th className="py-2 font-medium">Notes</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    checklists={checklists}
                    timeZone={timeZone}
                    showPlayer={false}
                    showChecklist={false}
                    averageMinutesPerDay={playtimeAvgByDate.get(zonedDateKey(s.startedAt, timeZone))}
                  />
                ))}
              </tbody>
            </table>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Completed per day"
          headerExtra={
            currentAverage != null && (
              <span className="whitespace-nowrap text-xs text-neutral-500">
                Current average: <span className="font-semibold text-violet-900 dark:text-violet-200">{currentAverage.toFixed(2)}</span>/day
              </span>
            )
          }
        >
          {completedRows.length === 0 ? (
            <p className="text-sm text-neutral-500">No completions logged yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-violet-200 text-neutral-500 dark:border-violet-800">
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Completed</th>
                  <th className="py-2 font-medium">Average</th>
                  <th className="py-2 font-medium">Est. date</th>
                </tr>
              </thead>
              <tbody>
                {[...completedRows].reverse().map((row) => (
                  <tr key={row.date} className="border-b border-neutral-100 dark:border-neutral-800">
                    <td className="py-2">{formatShortDate(parseISODateLocal(row.date))}</td>
                    <td className="py-2">{row.completed}</td>
                    <td className="py-2">{row.average.toFixed(2)}</td>
                    <td className="py-2">{row.estDate ? formatShortDate(row.estDate) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}

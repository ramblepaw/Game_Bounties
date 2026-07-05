import {
  playtimePerGame,
  completionVelocityByDay,
  tokenHistory,
  allUserBadges,
  checklistCompletionRates,
} from "@/server/queries/stats";
import { PlaytimeChart } from "@/components/stats/playtime-chart";
import { VelocityChart } from "@/components/stats/velocity-chart";
import { TokenHistoryTable } from "@/components/stats/token-history-table";
import { BadgeShelf } from "@/components/badges/badge-shelf";
import { ProgressBar } from "@/components/checklists/progress-bar";

export default async function StatsPage() {
  const [playtime, velocity, transactions, badges, completionRates] = await Promise.all([
    playtimePerGame(),
    completionVelocityByDay(),
    tokenHistory(),
    allUserBadges(),
    checklistCompletionRates(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-lg font-bold text-violet-950 dark:text-violet-100">Statistics</h1>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-fuchsia-700 dark:text-fuchsia-400">Playtime per game</h2>
        <PlaytimeChart data={playtime} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-fuchsia-700 dark:text-fuchsia-400">Checklist completions — last 30 days</h2>
        <VelocityChart data={velocity} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-fuchsia-700 dark:text-fuchsia-400">Checklist completion rates</h2>
        {completionRates.length === 0 ? (
          <p className="text-neutral-500">No checklists yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {completionRates.map((c) => (
              <li key={c.label} className="flex flex-col gap-1">
                <div className="flex justify-between text-sm">
                  <span>{c.label}</span>
                  <span className="text-neutral-500">{c.percent}%</span>
                </div>
                <ProgressBar percent={c.percent} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-fuchsia-700 dark:text-fuchsia-400">Badges</h2>
        <BadgeShelf awards={badges} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-fuchsia-700 dark:text-fuchsia-400">Token history</h2>
        <TokenHistoryTable transactions={transactions} />
      </section>
    </div>
  );
}

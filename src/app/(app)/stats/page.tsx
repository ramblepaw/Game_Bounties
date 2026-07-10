import {
  playtimePerGame,
  completionVelocityByDay,
  tokenHistory,
  allUserBadges,
  checklistCompletionRatesByGame,
} from "@/server/queries/stats";
import { PlaytimeChart } from "@/components/stats/playtime-chart";
import { VelocityChart } from "@/components/stats/velocity-chart";
import { TokenHistoryTable } from "@/components/stats/token-history-table";
import { BadgeShelf } from "@/components/badges/badge-shelf";
import { ProgressBar } from "@/components/checklists/progress-bar";

export default async function StatsPage() {
  const [playtime, velocity, transactions, badges, completionByGame] = await Promise.all([
    playtimePerGame(),
    completionVelocityByDay(),
    tokenHistory(),
    allUserBadges(),
    checklistCompletionRatesByGame(),
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
        <h2 className="font-medium text-fuchsia-700 dark:text-fuchsia-400">Checklist completion by player</h2>
        {completionByGame.length === 0 ? (
          <p className="text-neutral-500">No checklists yet.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {completionByGame.map((game) => (
              <div key={game.gameId} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-violet-950 dark:text-violet-100">{game.gameTitle}</h3>
                <ul className="flex flex-col gap-3">
                  {game.checklists.map((c) => (
                    <li key={c.checklistName} className="flex flex-col gap-1.5">
                      <span className="text-sm text-neutral-600 dark:text-neutral-300">{c.checklistName}</span>
                      <div className="flex flex-col gap-1">
                        {c.perUser.map((u) => (
                          <div key={u.userId} className="flex items-center gap-2">
                            <span className="w-24 shrink-0 truncate text-xs text-neutral-500">
                              {u.displayName}
                            </span>
                            <ProgressBar percent={u.percent} />
                            <span className="w-10 shrink-0 text-right text-xs text-neutral-500">
                              {u.percent}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
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

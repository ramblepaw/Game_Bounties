import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getProfileData } from "@/server/queries/profile";
import { listActiveChecklistsFor } from "@/server/queries/active-checklists";
import { listPendingApprovalsFor } from "@/server/queries/approvals";
import { listPurchases } from "@/server/queries/purchases";
import { getTokenBalance } from "@/lib/token-ledger";
import { formatMinutes } from "@/lib/format";
import { db } from "@/lib/db";
import { StopRunningButton } from "@/components/checklists/stop-running-button";
import { Button } from "@/components/ui/button";

export default async function OverviewPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [{ user, completedCount, totalMinutes }, activeChecklists, pending, purchases, balance, gameCount] =
    await Promise.all([
      getProfileData(session.userId),
      listActiveChecklistsFor(session.userId),
      listPendingApprovalsFor(session.userId),
      listPurchases(),
      getTokenBalance(),
      db.game.count(),
    ]);

  const recentPurchases = purchases.slice(0, 4);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-lg font-bold text-violet-950 dark:text-violet-100">
          Welcome back, {user.displayName}
        </h1>
        <p className="text-sm text-neutral-500">Here&apos;s where things stand.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Tokens" value={`🪙 ${balance}`} />
        <StatCard label="Games in library" value={gameCount} />
        <StatCard label="Checklists completed" value={completedCount} />
        <StatCard label="Total playtime" value={formatMinutes(totalMinutes)} />
      </div>

      {pending.length > 0 && (
        <Link
          href="/approvals"
          className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 shadow-sm transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60"
        >
          <span className="font-medium">
            {pending.length} completion{pending.length === 1 ? "" : "s"} waiting on your review
          </span>
          <span>Review →</span>
        </Link>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-fuchsia-700 dark:text-fuchsia-400">Currently running</h2>
        {activeChecklists.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Not running anything right now.{" "}
            <Link href="/games" className="text-violet-600 hover:underline dark:text-violet-300">
              Browse your games →
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activeChecklists.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30"
              >
                <Link
                  href={`/games/${a.checklist.gameId}/checklists/${a.checklistId}`}
                  className="text-sm font-medium text-emerald-800 hover:underline dark:text-emerald-300"
                >
                  {a.checklist.game.title} — {a.checklist.name}
                </Link>
                <StopRunningButton checklistId={a.checklistId} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-fuchsia-700 dark:text-fuchsia-400">Recent purchases</h2>
          <Link href="/purchases" className="text-sm text-violet-600 hover:underline dark:text-violet-300">
            View all →
          </Link>
        </div>
        {recentPurchases.length === 0 ? (
          <p className="text-sm text-neutral-500">No purchases logged yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentPurchases.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-violet-200 bg-white p-3 text-sm shadow-sm dark:border-violet-800 dark:bg-neutral-900"
              >
                <span>{p.title}</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">🪙 {p.tokenCost}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/games" className="self-start">
        <Button>Browse your games library →</Button>
      </Link>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-violet-200 bg-violet-50 p-4 text-center dark:border-violet-800 dark:bg-violet-950/40">
      <p className="text-lg font-bold text-violet-900 dark:text-violet-200">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

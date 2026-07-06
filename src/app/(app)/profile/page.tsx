import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getProfileData, listApprovedCompletionsFor } from "@/server/queries/profile";
import { listActiveChecklistsFor } from "@/server/queries/active-checklists";
import { formatMinutes } from "@/lib/format";
import { DEFAULT_ACTIVE_CHECKLIST_LIMIT } from "@/lib/limits";
import { isTokenless } from "@/lib/token-economy";
import { BadgeShelf } from "@/components/badges/badge-shelf";
import { StopRunningButton } from "@/components/checklists/stop-running-button";
import { EditableActiveLimit } from "./editable-active-limit";
import { AccountSettings } from "./account-settings";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [{ user, badges, completedCount, totalMinutes }, activeChecklists, archive] = await Promise.all([
    getProfileData(session.userId),
    listActiveChecklistsFor(session.userId),
    listApprovedCompletionsFor(session.userId),
  ]);

  const limit = user.activeChecklistLimit ?? DEFAULT_ACTIVE_CHECKLIST_LIMIT;
  const countedActive = activeChecklists.filter((a) => !isTokenless(a.checklist.tokenReward)).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-lg font-bold text-violet-950 dark:text-violet-100">{user.displayName}</h1>
        <p className="text-sm text-neutral-500">@{user.username}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-lg border border-violet-200 bg-violet-50 p-4 text-center dark:border-violet-800 dark:bg-violet-950/40 sm:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-violet-900 dark:text-violet-200">{completedCount}</p>
          <p className="text-xs text-neutral-500">Checklists completed</p>
        </div>
        <div>
          <p className="text-lg font-bold text-violet-900 dark:text-violet-200">{formatMinutes(totalMinutes)}</p>
          <p className="text-xs text-neutral-500">Total playtime</p>
        </div>
        <div>
          <p className="text-lg font-bold text-violet-900 dark:text-violet-200">{badges.length}</p>
          <p className="text-xs text-neutral-500">Badges earned</p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-fuchsia-700 dark:text-fuchsia-400">Badges</h2>
        <BadgeShelf awards={badges} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-fuchsia-700 dark:text-fuchsia-400">
            Currently running ({countedActive} / {limit})
          </h2>
        </div>
        <EditableActiveLimit limit={user.activeChecklistLimit} />
        {activeChecklists.length === 0 ? (
          <p className="text-sm text-neutral-500">Not running any checklists right now.</p>
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
                  {isTokenless(a.checklist.tokenReward) && (
                    <span className="ml-2 text-xs font-normal text-neutral-500">(free — doesn&apos;t count against limit)</span>
                  )}
                </Link>
                <StopRunningButton checklistId={a.checklistId} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-fuchsia-700 dark:text-fuchsia-400">Archive</h2>
        {archive.length === 0 ? (
          <p className="text-sm text-neutral-500">No approved completions yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {archive.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-violet-200 bg-white p-3 text-sm shadow-sm dark:border-violet-800 dark:bg-neutral-900"
              >
                <Link
                  href={`/games/${c.checklist.gameId}/checklists/${c.checklistId}`}
                  className="font-medium text-violet-800 hover:underline dark:text-violet-200"
                >
                  {c.checklist.game.title} — {c.checklist.name}
                </Link>
                <span className="text-xs text-neutral-500">
                  {c.reviewedAt?.toLocaleDateString()} · reviewed by {c.reviewedBy?.displayName}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-fuchsia-700 dark:text-fuchsia-400">Account settings</h2>
        <AccountSettings username={user.username} displayName={user.displayName} />
      </section>
    </div>
  );
}

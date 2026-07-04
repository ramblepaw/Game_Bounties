import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getGameWithChecklists } from "@/server/queries/games";
import { checklistProgress } from "@/server/queries/games";
import { totalPlaytimeMinutesForGame } from "@/server/queries/sessions";
import { listActiveChecklistIdsFor } from "@/server/queries/active-checklists";
import { getSession, getPeerUser } from "@/lib/auth";
import { getCooldownFor } from "@/lib/cooldown";
import { formatMinutes } from "@/lib/format";
import { ProgressBar } from "@/components/checklists/progress-bar";
import { RunChecklistButton } from "@/components/checklists/run-checklist-button";
import { WaiveCooldownButton } from "@/components/checklists/waive-cooldown-button";
import { Button } from "@/components/ui/button";
import { deleteGame } from "@/server/actions/games";

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const game = await getGameWithChecklists(gameId);
  if (!game) notFound();

  const [totalMinutes, activeIds, peer] = await Promise.all([
    totalPlaytimeMinutesForGame(gameId),
    listActiveChecklistIdsFor(session.userId),
    getPeerUser(),
  ]);

  const cooldowns = new Map(
    await Promise.all(
      game.checklists.map(async (checklist) => {
        const [own, peerCooldown] = await Promise.all([
          getCooldownFor(checklist.id, session.userId),
          peer ? getCooldownFor(checklist.id, peer.id) : null,
        ]);
        return [checklist.id, { own, peerCooldown }] as const;
      }),
    ),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4">
        <div className="relative aspect-[3/4] w-32 shrink-0 overflow-hidden rounded-lg bg-violet-100 shadow dark:bg-violet-950">
          {game.coverImageUrl ? (
            <Image
              src={game.coverImageUrl}
              alt={game.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-violet-400">
              No cover
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-violet-950 dark:text-violet-100">{game.title}</h1>
          {game.platform && <p className="text-sm text-fuchsia-700 dark:text-fuchsia-400">{game.platform}</p>}
          {game.releaseYear && <p className="text-sm text-neutral-500 dark:text-neutral-400">{game.releaseYear}</p>}
          {game.genres && <p className="text-xs text-neutral-400">{game.genres}</p>}
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Total playtime: {formatMinutes(totalMinutes)}</p>
          {game.summary && <p className="max-w-prose text-sm text-neutral-600 dark:text-neutral-300">{game.summary}</p>}
          {game.notes && <p className="max-w-prose text-sm text-neutral-600 dark:text-neutral-300">{game.notes}</p>}
          <div className="flex gap-2">
            <Link href={`/games/${gameId}/edit`}>
              <Button variant="secondary" size="sm">
                Edit game
              </Button>
            </Link>
            <form action={deleteGame.bind(null, gameId)}>
              <Button variant="danger" size="sm" type="submit">
                Delete game
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-medium text-violet-950 dark:text-violet-100">Checklists</h2>
        <Link href={`/games/${gameId}/checklists/new`}>
          <Button size="sm">Add checklist</Button>
        </Link>
      </div>

      {game.checklists.length === 0 ? (
        <p className="text-neutral-500">No checklists yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {game.checklists.map((checklist) => {
            const progress = checklistProgress(checklist);
            const isActive = activeIds.has(checklist.id);
            const cooldown = cooldowns.get(checklist.id);
            return (
              <li
                key={checklist.id}
                className="flex flex-col gap-2 rounded-lg border border-violet-200 bg-white p-4 shadow-sm dark:border-violet-800 dark:bg-neutral-900"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-violet-950 dark:text-violet-100">{checklist.name}</span>
                    {isActive && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Running
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {cooldown?.own ? (
                      <p className="max-w-[10rem] text-xs text-neutral-500">
                        You can run this again on {cooldown.own.readyAt.toLocaleDateString()}
                      </p>
                    ) : cooldown?.peerCooldown ? (
                      <div className="flex flex-col items-end gap-1">
                        <p className="max-w-[10rem] text-right text-xs text-neutral-500">
                          {peer?.displayName} can run this again on{" "}
                          {cooldown.peerCooldown.readyAt.toLocaleDateString()}
                        </p>
                        <WaiveCooldownButton completionId={cooldown.peerCooldown.completionId} />
                      </div>
                    ) : (
                      <RunChecklistButton
                        checklistId={checklist.id}
                        href={`/games/${gameId}/checklists/${checklist.id}`}
                        isActive={isActive}
                      />
                    )}
                    <Link
                      href={`/games/${gameId}/checklists/${checklist.id}/edit`}
                      className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                      ✎ Edit
                    </Link>
                  </div>
                </div>
                <ProgressBar percent={progress.percent} />
                <p className="text-xs text-neutral-500">
                  {progress.completed} / {progress.total} complete
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

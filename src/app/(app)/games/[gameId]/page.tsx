import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getGameWithChecklists } from "@/server/queries/games";
import { checklistProgress } from "@/server/queries/games";
import { totalPlaytimeMinutesForGame } from "@/server/queries/sessions";
import { listActiveChecklistIdsFor } from "@/server/queries/active-checklists";
import { getSession, getPeerUser } from "@/lib/auth";
import { getCooldownFor } from "@/lib/cooldown";
import { formatMinutes } from "@/lib/format";
import { GameCover } from "@/components/games/game-cover";
import { ChecklistList, type ChecklistListItem } from "@/components/checklists/checklist-list";
import { ImportChecklistForm } from "@/components/checklists/import-checklist-form";
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

  const game = await getGameWithChecklists(gameId, session.userId);
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
      <Link href="/games" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
        ← Back to library
      </Link>

      <div className="flex gap-4">
        <div className="relative aspect-[3/4] w-32 shrink-0 overflow-hidden rounded-lg bg-violet-100 shadow dark:bg-violet-950">
          <GameCover
            title={game.title}
            coverImageUrl={game.coverImageUrl}
            secondaryCoverImageUrl={game.secondaryCoverImageUrl}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="truncate text-xl font-semibold text-violet-950 dark:text-violet-100">
            {game.title}
            {game.secondaryTitle && <span className="text-neutral-400"> &amp; {game.secondaryTitle}</span>}
          </h1>
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
        <div className="flex items-center gap-2">
          <ImportChecklistForm gameId={gameId} />
          <Link href={`/games/${gameId}/checklists/new`}>
            <Button size="sm">Add checklist</Button>
          </Link>
        </div>
      </div>

      {game.checklists.length === 0 ? (
        <p className="text-neutral-500">No checklists yet.</p>
      ) : (
        <ChecklistList
          gameId={gameId}
          peerDisplayName={peer?.displayName ?? null}
          checklists={game.checklists.map((checklist): ChecklistListItem => {
            const progress = checklistProgress(checklist);
            const cooldown = cooldowns.get(checklist.id);
            return {
              id: checklist.id,
              name: checklist.name,
              progressPercent: progress.percent,
              progressCompleted: progress.completed,
              progressTotal: progress.total,
              isActive: activeIds.has(checklist.id),
              ownCooldownReadyAt: cooldown?.own?.readyAt ?? null,
              peerCooldown: cooldown?.peerCooldown
                ? { readyAt: cooldown.peerCooldown.readyAt, completionId: cooldown.peerCooldown.completionId }
                : null,
            };
          })}
        />
      )}
    </div>
  );
}

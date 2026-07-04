import { notFound } from "next/navigation";
import { getGame } from "@/server/queries/games";
import { EditGameForm } from "./edit-game-form";

export default async function EditGamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const game = await getGame(gameId);
  if (!game) notFound();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-lg font-bold text-violet-950 dark:text-violet-100">Edit game</h1>
      <EditGameForm game={game} />
    </div>
  );
}

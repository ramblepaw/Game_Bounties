import Link from "next/link";
import { redirect } from "next/navigation";
import { listGames, checklistProgress } from "@/server/queries/games";
import { getSession } from "@/lib/auth";
import { GameCarousel } from "@/components/games/game-carousel";
import { Button } from "@/components/ui/button";

export default async function GamesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const games = await listGames(session.userId);

  const carouselGames = games.map((game) => {
    const allItems = game.checklists.flatMap((c) => checklistProgress(c));
    const total = allItems.reduce((sum, p) => sum + p.total, 0);
    const completed = allItems.reduce((sum, p) => sum + p.completed, 0);
    return {
      id: game.id,
      title: game.title,
      secondaryTitle: game.secondaryTitle,
      platform: game.platform,
      coverImageUrl: game.coverImageUrl,
      secondaryCoverImageUrl: game.secondaryCoverImageUrl,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-violet-950 dark:text-violet-100">Your games</h1>
        <Link href="/games/new">
          <Button size="sm">+ Add game</Button>
        </Link>
      </div>
      <GameCarousel games={carouselGames} />
    </div>
  );
}

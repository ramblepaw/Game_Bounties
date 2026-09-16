import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listGames, listShelves, checklistProgress } from "@/server/queries/games";
import { getSession } from "@/lib/auth";
import { GamesLibrary } from "@/components/games/games-library";
import { Button } from "@/components/ui/button";

export default async function GamesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [games, shelves] = await Promise.all([listGames(session.userId), listShelves(session.userId)]);
  // Resolved here rather than on the client so the first render matches the
  // HTML the server sent -- same approach the root layout takes for the theme.
  const initialView = (await cookies()).get("games-view")?.value === "shelves" ? "shelves" : "carousel";

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
    // overflow-x-hidden is scoped to this page (not html/body -- see globals.css
    // history) because setting it on a shared ancestor forces overflow-y to
    // compute as "auto" too (CSS spec), which turns that ancestor into its own
    // scroll container and breaks `position: sticky` on other pages, like the
    // checklist designer's properties panel.
    <div className="flex flex-col gap-6 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-violet-950 dark:text-violet-100">Your games</h1>
        <Link href="/games/new">
          <Button size="sm">+ Add game</Button>
        </Link>
      </div>
      <GamesLibrary carouselGames={carouselGames} shelves={shelves} initialView={initialView} />
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { GameCarousel } from "@/components/games/game-carousel";
import { GameShelves } from "@/components/games/game-shelves";
import { setGamesView, type GamesView } from "@/server/actions/games-view";
import type { Shelf } from "@/server/queries/games";
import { cn } from "@/lib/cn";

type CarouselGame = React.ComponentProps<typeof GameCarousel>["games"][number];

export function GamesLibrary({
  carouselGames,
  shelves,
  initialView,
}: {
  carouselGames: CarouselGame[];
  shelves: Shelf[];
  initialView: GamesView;
}) {
  // The server already resolved the remembered view from a cookie, so the first
  // render matches the HTML it sent. Local state only tracks clicks from here.
  const [view, setView] = useState<GamesView>(initialView);
  const [, startTransition] = useTransition();

  function choose(next: GamesView) {
    setView(next);
    // Persisted for the next visit; no router.refresh, since the data for both
    // views is already on the page and swapping shouldn't cost a round trip.
    startTransition(() => {
      void setGamesView(next);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-violet-200 p-0.5 dark:border-violet-800">
          {(
            [
              ["carousel", "Carousel"],
              ["shelves", "Groups"],
            ] as const
          ).map(([option, label]) => (
            <button
              key={option}
              type="button"
              onClick={() => choose(option)}
              aria-pressed={view === option}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                view === option
                  ? "bg-violet-600 text-white"
                  : "text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === "carousel" ? <GameCarousel games={carouselGames} /> : <GameShelves shelves={shelves} />}
    </div>
  );
}

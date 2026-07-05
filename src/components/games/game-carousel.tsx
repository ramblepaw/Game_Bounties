"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/checklists/progress-bar";
import { GameCover } from "@/components/games/game-cover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SPIN_STEP_MS = 90;
const SWIPE_THRESHOLD_PX = 40;

type CarouselGame = {
  id: string;
  title: string;
  secondaryTitle: string | null;
  platform: string | null;
  coverImageUrl: string | null;
  secondaryCoverImageUrl: string | null;
  percent: number;
};

const CARD_WIDTH = 340;
const CARD_HEIGHT = Math.round((CARD_WIDTH * 4) / 3);
const TILT_ANGLE = 35;
const MAX_VISIBLE = 3;
// The centered card is flat (0deg) while neighbors are tilted, so those planes
// aren't parallel. Where they overlap on screen, preserve-3d's depth compositing
// isn't precise enough to avoid a seam at the crossing edge — so the gap must be
// wide enough that a tilted neighbor's foreshortened silhouette never reaches
// into the centered card's footprint at all. These ratios (relative to
// CARD_WIDTH) are what kept that gap safe at the previous size — keep them
// fixed if CARD_WIDTH changes again.
const X_BASE_GAP = Math.round(CARD_WIDTH * 0.958);
const X_STEP_GAP = Math.round(CARD_WIDTH * 0.375);
const Z_STEP = Math.round(CARD_WIDTH * 0.583);

/** Shortest signed distance from `i` to `index` around a ring of size `n`. */
function ringOffset(i: number, index: number, n: number): number {
  let offset = ((i - index) % n) + n;
  offset %= n;
  if (offset > n / 2) offset -= n;
  return offset;
}

export function GameCarousel({ games }: { games: CarouselGame[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [notFound, setNotFound] = useState(false);
  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const n = games.length;

  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    };
  }, []);

  if (n === 0) {
    return <p className="text-neutral-500">No games yet. Add your first one below.</p>;
  }

  const prev = () => setIndex((i) => (i - 1 + n) % n);
  const next = () => setIndex((i) => (i + 1) % n);
  const active = games[index];

  function spinToIndex(targetIndex: number) {
    if (spinIntervalRef.current) return;
    const steps = ringOffset(targetIndex, index, n);
    if (steps === 0) return;
    const direction = steps > 0 ? 1 : -1;
    let remaining = Math.abs(steps);
    spinIntervalRef.current = setInterval(() => {
      setIndex((i) => (i + direction + n) % n);
      remaining -= 1;
      if (remaining <= 0 && spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
        spinIntervalRef.current = null;
      }
    }, SPIN_STEP_MS);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (deltaX > SWIPE_THRESHOLD_PX) prev();
    else if (deltaX < -SWIPE_THRESHOLD_PX) next();
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const targetIndex = games.findIndex(
      (g) => g.title.toLowerCase().includes(q) || g.secondaryTitle?.toLowerCase().includes(q),
    );
    if (targetIndex === -1) {
      setNotFound(true);
      return;
    }
    setNotFound(false);
    spinToIndex(targetIndex);
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <form onSubmit={handleSearchSubmit} className="flex w-full max-w-sm gap-2">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setNotFound(false);
          }}
          placeholder="Search games…"
          className="flex-1"
        />
        <Button type="submit" size="sm">
          Go
        </Button>
      </form>
      {notFound && <p className="text-xs text-red-500">No game matches &quot;{query}&quot;.</p>}

      <div
        className="relative w-full"
        style={{ height: CARD_HEIGHT + 60, perspective: "1600px" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            marginLeft: -CARD_WIDTH / 2,
            marginTop: -CARD_HEIGHT / 2,
            transformStyle: "preserve-3d",
          }}
        >
          {games.map((game, i) => {
            const offset = ringOffset(i, index, n);
            const mag = Math.abs(offset);
            if (mag > MAX_VISIBLE) return null;

            const isFront = offset === 0;
            const sign = Math.sign(offset);
            const x = sign === 0 ? 0 : sign * (X_BASE_GAP + (mag - 1) * X_STEP_GAP);
            const z = -mag * Z_STEP;
            const rotate = sign === 0 ? 0 : sign * TILT_ANGLE;
            const scale = Math.max(0.6, 1 - mag * 0.12);
            const opacity = Math.max(0.25, 1 - mag * 0.28);

            return (
              <div
                key={game.id}
                role="button"
                tabIndex={0}
                onClick={() => (isFront ? router.push(`/games/${game.id}`) : setIndex(i))}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  if (isFront) router.push(`/games/${game.id}`);
                  else setIndex(i);
                }}
                className="absolute inset-0 flex cursor-pointer flex-col gap-2 rounded-xl border border-violet-200 bg-white p-3 shadow-xl transition-transform duration-500 ease-out [backface-visibility:hidden] dark:border-violet-800 dark:bg-neutral-900"
                style={{
                  transform: `translateX(${x}px) translateZ(${z}px) rotateY(${rotate}deg) scale(${scale})`,
                  opacity,
                  zIndex: MAX_VISIBLE - mag,
                  transitionProperty: "transform, opacity",
                }}
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-violet-100 dark:bg-violet-950">
                  <GameCover
                    title={game.title}
                    coverImageUrl={game.coverImageUrl}
                    secondaryCoverImageUrl={game.secondaryCoverImageUrl}
                  />
                </div>
                {isFront && (
                  <div>
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-violet-100">
                      {game.title}
                      {game.secondaryTitle && <span className="text-neutral-400"> &amp; {game.secondaryTitle}</span>}
                    </p>
                    {game.platform && (
                      <p className="truncate text-xs text-fuchsia-600 dark:text-fuchsia-400">
                        {game.platform}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-3">
        <div className="relative flex w-full min-h-[52px] items-center justify-center">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous"
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full border border-violet-200 bg-white p-2 text-violet-700 shadow hover:bg-violet-50 dark:border-violet-800 dark:bg-neutral-900 dark:text-violet-300 dark:hover:bg-violet-950"
          >
            ‹
          </button>
          <div className="max-w-[65%] text-center">
            <p className="truncate font-medium text-neutral-900 dark:text-violet-100">
              {active.title}
              {active.secondaryTitle && <span className="text-neutral-400"> &amp; {active.secondaryTitle}</span>}
            </p>
            {active.platform && (
              <p className="truncate text-xs text-fuchsia-600 dark:text-fuchsia-400">{active.platform}</p>
            )}
          </div>
          <button
            type="button"
            onClick={next}
            aria-label="Next"
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full border border-violet-200 bg-white p-2 text-violet-700 shadow hover:bg-violet-50 dark:border-violet-800 dark:bg-neutral-900 dark:text-violet-300 dark:hover:bg-violet-950"
          >
            ›
          </button>
        </div>
        <ProgressBar percent={active.percent} />
      </div>
    </div>
  );
}

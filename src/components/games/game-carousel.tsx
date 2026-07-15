"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/checklists/progress-bar";
import { GameCover } from "@/components/games/game-cover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SPIN_STEP_MS = 90;
const SWIPE_THRESHOLD_PX = 40;
const WHEEL_THRESHOLD = 50;
// Caps how many steps a single scroll gesture can stack up. Without a cap, a
// long fast flick (or a trackpad's momentum tail continuing to fire events
// after the physical scroll stops) could queue up an unbounded backlog that
// takes a long time to drain, making the carousel feel like it keeps
// scrolling on its own with no way to stop it. Capping it means the queue
// always empties within WHEEL_QUEUE_CAP * SPIN_STEP_MS of the last real
// wheel event, while still letting a sustained fast scroll move through many
// games quickly (the queue keeps refilling as long as real input keeps
// crossing the threshold).
const WHEEL_QUEUE_CAP = 6;

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

/** Case- and diacritic-insensitive, so "pokemon" matches "Pokémon Red Version". */
function normalizeForSearch(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

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
  const [searchResults, setSearchResults] = useState<{ index: number; game: CarouselGame }[]>([]);
  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const wheelAccumRef = useRef(0);
  const wheelQueueRef = useRef(0);
  const wheelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastWheelTimestampRef = useRef<number | null>(null);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isWheeling, setIsWheeling] = useState(false);
  const n = games.length;

  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
      if (wheelIntervalRef.current) clearInterval(wheelIntervalRef.current);
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
    setDragOffsetPx(0);
    setIsDragging(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartXRef.current === null) return;
    setDragOffsetPx(e.touches[0].clientX - touchStartXRef.current);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    setDragOffsetPx(0);
    setIsDragging(false);
    if (deltaX > SWIPE_THRESHOLD_PX) prev();
    else if (deltaX < -SWIPE_THRESHOLD_PX) next();
  }

  function drainWheelQueue() {
    if (wheelIntervalRef.current) return;
    setIsWheeling(true);
    wheelIntervalRef.current = setInterval(() => {
      if (wheelQueueRef.current > 0) {
        next();
        wheelQueueRef.current -= 1;
      } else if (wheelQueueRef.current < 0) {
        prev();
        wheelQueueRef.current += 1;
      }
      if (wheelQueueRef.current === 0 && wheelIntervalRef.current) {
        clearInterval(wheelIntervalRef.current);
        wheelIntervalRef.current = null;
        setIsWheeling(false);
      }
    }, SPIN_STEP_MS);
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    // This dev build's wheel-event dispatch delivers each native wheel event
    // to this handler twice (same timeStamp, two separate SyntheticEvent
    // wrappers) -- every scroll tick was silently counted twice, which is
    // what made the queue balloon out of control. Drop the repeat.
    if (e.timeStamp === lastWheelTimestampRef.current) return;
    lastWheelTimestampRef.current = e.timeStamp;
    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    wheelAccumRef.current += delta;
    // A single physical notch commonly reports a deltaY of ~100-120, which is
    // more than double WHEEL_THRESHOLD -- dividing that one event's magnitude
    // across multiple threshold crossings (the previous `while` loop) queued
    // 2 steps for what the user felt as 1 notch. Cap each event to at most one
    // queued step; a sustained scroll still queues more because it keeps
    // producing more events, not because any single event is worth more.
    if (wheelAccumRef.current > WHEEL_THRESHOLD) {
      wheelQueueRef.current = Math.min(WHEEL_QUEUE_CAP, wheelQueueRef.current + 1);
      wheelAccumRef.current = 0;
    } else if (wheelAccumRef.current < -WHEEL_THRESHOLD) {
      wheelQueueRef.current = Math.max(-WHEEL_QUEUE_CAP, wheelQueueRef.current - 1);
      wheelAccumRef.current = 0;
    }
    if (wheelQueueRef.current !== 0) drainWheelQueue();
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = normalizeForSearch(query.trim());
    if (!q) return;
    const matches = games
      .map((game, i) => ({ game, index: i }))
      .filter(
        ({ game }) =>
          normalizeForSearch(game.title).includes(q) ||
          (game.secondaryTitle && normalizeForSearch(game.secondaryTitle).includes(q)),
      );
    setSearchResults(matches);
    setNotFound(matches.length === 0);
  }

  function pickSearchResult(targetIndex: number) {
    spinToIndex(targetIndex);
    setSearchResults([]);
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <form onSubmit={handleSearchSubmit} className="flex w-full max-w-sm gap-2">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setNotFound(false);
            setSearchResults([]);
          }}
          placeholder="Search games…"
          className="flex-1"
        />
        <Button type="submit" size="sm">
          Go
        </Button>
      </form>
      {notFound && <p className="text-xs text-red-500">No game matches &quot;{query}&quot;.</p>}
      {searchResults.length > 0 && (
        <ul className="flex w-full max-w-sm flex-col gap-1 rounded-lg border border-violet-200 bg-white p-2 shadow dark:border-violet-800 dark:bg-neutral-900">
          {searchResults.map(({ game, index: resultIndex }) => (
            <li key={game.id}>
              <button
                type="button"
                onClick={() => pickSearchResult(resultIndex)}
                className="flex w-full items-center gap-3 rounded-md p-2 text-left text-sm hover:bg-violet-50 dark:hover:bg-violet-950"
              >
                <div className="relative aspect-[3/4] h-12 w-9 shrink-0 overflow-hidden rounded bg-violet-100 dark:bg-violet-950">
                  <GameCover
                    title={game.title}
                    coverImageUrl={game.coverImageUrl}
                    secondaryCoverImageUrl={game.secondaryCoverImageUrl}
                  />
                </div>
                <span className="min-w-0 truncate">
                  {game.title}
                  {game.secondaryTitle && <span className="text-neutral-400"> &amp; {game.secondaryTitle}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        className="relative w-full"
        style={{ height: CARD_HEIGHT + 60, perspective: "1600px", touchAction: "pan-y" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
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
            const staticOffset = ringOffset(i, index, n);
            const isFront = staticOffset === 0;
            // While a touch drag is in progress, blend the ring position
            // toward the neighbor being dragged toward so cards visually
            // track the finger instead of only snapping at touchend.
            const dragProgress = Math.max(-1, Math.min(1, -dragOffsetPx / CARD_WIDTH));
            const offset = staticOffset - dragProgress;
            const mag = Math.abs(offset);
            if (mag > MAX_VISIBLE) return null;

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
                className="absolute inset-0 flex cursor-pointer flex-col gap-2 rounded-xl border border-violet-200 bg-white p-3 shadow-xl [backface-visibility:hidden] dark:border-violet-800 dark:bg-neutral-900"
                style={{
                  transform: `translateX(${x}px) translateZ(${z}px) rotateY(${rotate}deg) scale(${scale})`,
                  opacity,
                  zIndex: MAX_VISIBLE - Math.round(mag),
                  transitionProperty: "transform, opacity",
                  // While actively draining queued wheel steps, each step's
                  // 500ms transition would still be interrupted by the next
                  // one every SPIN_STEP_MS -- the "front" label snaps to the
                  // new card instantly (isFront is a plain boolean) while its
                  // card visually keeps chasing the center, which reads as
                  // off-center. Match the transition to the step cadence so
                  // each card actually arrives before the next step starts.
                  transitionDuration: isDragging ? "0ms" : isWheeling ? `${SPIN_STEP_MS}ms` : "500ms",
                  transitionTimingFunction: "ease-out",
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

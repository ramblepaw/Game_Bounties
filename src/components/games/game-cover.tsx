import Image from "next/image";

// `to bottom left` makes the gradient line's endpoint land exactly on that
// corner regardless of the box's aspect ratio, so this stays aligned with
// the same top-right-to-bottom-left diagonal at any cover size. The soft
// band (42%-58%) is what turns the seam into a blend instead of a hard cut.
const DIAGONAL_FADE = "linear-gradient(to bottom left, transparent 0%, transparent 42%, black 58%, black 100%)";

/**
 * Renders a game's cover, or -- when a secondary cover is set (paired
 * versions sharing one checklist, e.g. Pokemon X & Y) -- both covers
 * blended diagonally. Must be placed inside a `relative` sized container.
 */
export function GameCover({
  title,
  coverImageUrl,
  secondaryCoverImageUrl,
}: {
  title: string;
  coverImageUrl: string | null;
  secondaryCoverImageUrl?: string | null;
}) {
  if (!coverImageUrl) {
    return <div className="flex h-full items-center justify-center text-xs text-violet-400">No cover</div>;
  }

  return (
    <>
      <Image src={coverImageUrl} alt={title} fill className="object-cover" unoptimized />
      {secondaryCoverImageUrl && (
        <Image
          src={secondaryCoverImageUrl}
          alt=""
          fill
          unoptimized
          className="object-cover"
          style={{ WebkitMaskImage: DIAGONAL_FADE, maskImage: DIAGONAL_FADE }}
        />
      )}
    </>
  );
}

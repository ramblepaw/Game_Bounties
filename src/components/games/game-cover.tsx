import Image from "next/image";

/**
 * Renders a game's cover, or -- when a secondary cover is set (paired
 * versions sharing one checklist, e.g. Pokemon X & Y) -- both covers as a
 * diagonal blend. Must be placed inside a `relative` sized container.
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
          style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
        />
      )}
    </>
  );
}

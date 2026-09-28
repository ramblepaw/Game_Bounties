/**
 * A checklist's badge: its own uploaded icon when it has one, the generic
 * medal otherwise. The icon is inset far enough that square art sits wholly
 * inside the circle instead of losing its corners.
 */
export function BadgeIcon({
  name,
  iconUrl,
  completedOn,
}: {
  name: string;
  iconUrl?: string | null;
  /** The day the run was finished -- submission, not the later approval -- already in the viewer's timezone. */
  completedOn?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-amber-100 text-xl dark:bg-amber-950/40">
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt="" className="h-full w-full object-contain p-2" />
        ) : (
          "🏅"
        )}
      </div>
      <span className="max-w-[5rem] truncate text-center text-xs text-neutral-500">{name}</span>
      {completedOn && <span className="text-[10px] text-neutral-400">{completedOn}</span>}
    </div>
  );
}

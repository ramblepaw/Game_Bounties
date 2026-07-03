export function BadgeIcon({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-xl dark:bg-amber-950/40">
        🏅
      </div>
      <span className="max-w-[5rem] truncate text-center text-xs text-neutral-500">{name}</span>
    </div>
  );
}

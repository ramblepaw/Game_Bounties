export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-violet-100 dark:bg-violet-950/60">
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 transition-[width]"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

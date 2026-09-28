import Link from "next/link";
import { BadgeIcon } from "./badge-icon";
import { runHref } from "@/lib/run-links";
import { formatShortDateIn } from "@/lib/timezone";

type Award = {
  id: string;
  awardedAt: Date;
  user?: { displayName: string };
  badge: { name: string; iconUrl: string | null };
  /** The run that earned it; each badge opens that run's archive. */
  completion: { id: string; submittedAt: Date; checklistId: string; checklist: { gameId: string } } | null;
};

export function BadgeShelf({ awards, timeZone }: { awards: Award[]; timeZone: string }) {
  if (awards.length === 0) {
    return <p className="text-neutral-500">No badges earned yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-4">
      {awards.map((a) => {
        const body = (
          <>
            <BadgeIcon
              name={a.badge.name}
              iconUrl={a.badge.iconUrl}
              completedOn={a.completion ? formatShortDateIn(a.completion.submittedAt, timeZone) : undefined}
            />
            {a.user && <span className="text-xs text-neutral-400">{a.user.displayName}</span>}
          </>
        );
        return a.completion ? (
          <Link
            key={a.id}
            href={runHref(a.completion.checklist.gameId, a.completion.checklistId, a.completion.id)}
            className="flex flex-col items-center gap-1 rounded-lg p-1 transition-colors hover:bg-violet-50 dark:hover:bg-violet-950/40"
          >
            {body}
          </Link>
        ) : (
          <div key={a.id} className="flex flex-col items-center gap-1 p-1">
            {body}
          </div>
        );
      })}
    </div>
  );
}

import { BadgeIcon } from "./badge-icon";

type Award = {
  id: string;
  awardedAt: Date;
  user?: { displayName: string };
  badge: { name: string };
};

export function BadgeShelf({ awards }: { awards: Award[] }) {
  if (awards.length === 0) {
    return <p className="text-neutral-500">No badges earned yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-4">
      {awards.map((a) => (
        <div key={a.id} className="flex flex-col items-center gap-1">
          <BadgeIcon name={a.badge.name} />
          {a.user && <span className="text-xs text-neutral-400">{a.user.displayName}</span>}
        </div>
      ))}
    </div>
  );
}

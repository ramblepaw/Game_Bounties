import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { listRecentSessions } from "@/server/queries/sessions";
import { getSession, getCurrentUser } from "@/lib/auth";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";
import { ManualSessionForm } from "./manual-session-form";
import { SessionRow } from "./session-row";

export default async function SessionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [checklists, sessions, user] = await Promise.all([
    db.checklist.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, game: { select: { title: true } } },
    }),
    listRecentSessions(),
    getCurrentUser(),
  ]);
  const timeZone = user?.timezone ?? DEFAULT_TIMEZONE;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold text-violet-950 dark:text-violet-100">Play sessions</h1>

      {checklists.length === 0 ? (
        <p className="text-neutral-500">Add a checklist before logging sessions.</p>
      ) : (
        <ManualSessionForm checklists={checklists} />
      )}

      {sessions.length === 0 ? (
        <p className="text-neutral-500">No sessions logged yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-violet-200 text-neutral-500 dark:border-violet-800">
              <th className="py-2 font-medium">Game — Checklist</th>
              <th className="py-2 font-medium">Player</th>
              <th className="py-2 font-medium">Date</th>
              <th className="py-2 font-medium">Duration</th>
              <th className="py-2 font-medium">Notes</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <SessionRow key={s.id} session={s} checklists={checklists} timeZone={timeZone} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

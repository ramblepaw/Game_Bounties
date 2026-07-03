import { NewChecklistForm } from "./new-checklist-form";

export default async function NewChecklistPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-lg font-bold text-violet-950 dark:text-violet-100">Add a checklist</h1>
      <NewChecklistForm gameId={gameId} />
    </div>
  );
}

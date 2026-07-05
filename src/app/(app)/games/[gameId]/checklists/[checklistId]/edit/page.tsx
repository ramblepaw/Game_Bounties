import { notFound } from "next/navigation";
import { getChecklistDetail, listGameTitles } from "@/server/queries/games";
import { ChecklistDesigner } from "@/components/checklists/checklist-designer";

export default async function ChecklistEditPage({
  params,
}: {
  params: Promise<{ gameId: string; checklistId: string }>;
}) {
  const { gameId, checklistId } = await params;
  const [checklist, games] = await Promise.all([getChecklistDetail(checklistId), listGameTitles()]);
  if (!checklist) notFound();

  return <ChecklistDesigner checklist={checklist} gameId={gameId} games={games} />;
}

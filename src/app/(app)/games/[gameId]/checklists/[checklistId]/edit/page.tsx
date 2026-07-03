import { notFound } from "next/navigation";
import { getChecklistDetail } from "@/server/queries/games";
import { ChecklistDesigner } from "@/components/checklists/checklist-designer";

export default async function ChecklistEditPage({
  params,
}: {
  params: Promise<{ gameId: string; checklistId: string }>;
}) {
  const { gameId, checklistId } = await params;
  const checklist = await getChecklistDetail(checklistId);
  if (!checklist) notFound();

  return <ChecklistDesigner checklist={checklist} gameId={gameId} />;
}

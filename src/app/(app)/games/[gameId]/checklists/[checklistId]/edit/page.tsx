import { notFound } from "next/navigation";
import { getChecklistDetail, listGameTitles, listColorPresets } from "@/server/queries/games";
import { ChecklistDesigner } from "@/components/checklists/checklist-designer";

export default async function ChecklistEditPage({
  params,
}: {
  params: Promise<{ gameId: string; checklistId: string }>;
}) {
  const { gameId, checklistId } = await params;
  const [checklist, games, colorPresets] = await Promise.all([
    getChecklistDetail(checklistId),
    listGameTitles(),
    listColorPresets(checklistId),
  ]);
  if (!checklist) notFound();

  return (
    <ChecklistDesigner checklist={checklist} gameId={gameId} games={games} colorPresets={colorPresets} />
  );
}

import { notFound } from "next/navigation";
import { getChecklistDetail, listGameTitles, listColorPresets } from "@/server/queries/games";
import { ChecklistDesigner } from "@/components/checklists/checklist-designer";
import { asStages } from "@/lib/stages";

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

  const designerChecklist = {
    ...checklist,
    tabs: checklist.tabs.map((tab) => ({
      ...tab,
      sections: tab.sections.map((section) => ({ ...section, stages: asStages(section.stages) })),
    })),
  };

  return (
    <ChecklistDesigner checklist={designerChecklist} gameId={gameId} games={games} colorPresets={colorPresets} />
  );
}

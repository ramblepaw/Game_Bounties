import { getSession } from "@/lib/auth";
import { getChecklistExportData } from "@/server/queries/games";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ checklistId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { checklistId } = await params;
  const data = await getChecklistExportData(checklistId);
  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const filename = `${data.name.replace(/[^a-z0-9_-]+/gi, "_") || "checklist"}.json`;
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

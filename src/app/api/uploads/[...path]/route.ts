import { readFile, stat } from "node:fs/promises";
import { getSession } from "@/lib/auth";
import { resolveUploadPath, UploadValidationError } from "@/lib/uploads";

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { path: segments } = await params;

  let filePath: string;
  try {
    filePath = resolveUploadPath(segments);
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return new Response("Not found", { status: 404 });
    }
    throw err;
  }

  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    return new Response("Not found", { status: 404 });
  }

  try {
    await stat(filePath);
    const buffer = await readFile(filePath);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

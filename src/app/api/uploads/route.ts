import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveUploadedImage, UploadValidationError, UPLOAD_KINDS, type UploadKind } from "@/lib/uploads";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = formData.get("kind");

  if (!(file instanceof File) || typeof kind !== "string" || !UPLOAD_KINDS.includes(kind as UploadKind)) {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  try {
    const url = await saveUploadedImage(file, kind as UploadKind);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

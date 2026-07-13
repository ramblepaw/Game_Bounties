import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  saveUploadedImage,
  saveImageFromUrl,
  UploadValidationError,
  UPLOAD_KINDS,
  type UploadKind,
} from "@/lib/uploads";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const sourceUrl = formData.get("url");
  const kind = formData.get("kind");

  if (typeof kind !== "string" || !UPLOAD_KINDS.includes(kind as UploadKind)) {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  try {
    // A pasted external URL is downloaded once and re-hosted through the same
    // pipeline as a file upload, rather than kept as a live hotlink -- that's
    // what stops it from breaking later if the source expires, gets
    // hotlink-blocked, or disappears entirely.
    if (typeof sourceUrl === "string" && sourceUrl) {
      const url = await saveImageFromUrl(sourceUrl, kind as UploadKind);
      return NextResponse.json({ url });
    }
    if (file instanceof File) {
      const url = await saveUploadedImage(file, kind as UploadKind);
      return NextResponse.json({ url });
    }
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

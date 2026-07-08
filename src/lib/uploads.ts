import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createId } from "@paralleldrive/cuid2";
import { fileTypeFromBuffer } from "file-type";

export type UploadKind = "covers" | "items" | "badges";
export const UPLOAD_KINDS: UploadKind[] = ["covers", "items", "badges"];

const UPLOAD_URL_PATTERN = /^\/api\/uploads\/(covers|items|badges)\/([^/]+)$/;

const UPLOAD_ROOT =
  process.env.UPLOADS_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), "uploads");

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_BYTES: Record<UploadKind, number> = {
  covers: 10 * 1024 * 1024,
  items: 2 * 1024 * 1024,
  badges: 2 * 1024 * 1024,
};

export class UploadValidationError extends Error {}

async function saveImageBuffer(buffer: Buffer, kind: UploadKind): Promise<string> {
  if (buffer.length === 0) {
    throw new UploadValidationError("Empty file.");
  }
  if (buffer.length > MAX_BYTES[kind]) {
    throw new UploadValidationError(
      `File too large (max ${Math.floor(MAX_BYTES[kind] / 1024 / 1024)}MB).`,
    );
  }

  const sniffed = await fileTypeFromBuffer(buffer);
  if (!sniffed || !ALLOWED_MIME_TYPES.has(sniffed.mime)) {
    throw new UploadValidationError("Unsupported image type. Use PNG, JPEG, WebP, or GIF.");
  }

  const dir = path.join(UPLOAD_ROOT, kind);
  await mkdir(dir, { recursive: true });

  const filename = `${createId()}.${sniffed.ext}`;
  await writeFile(path.join(dir, filename), buffer);

  return `/api/uploads/${kind}/${filename}`;
}

export async function saveUploadedImage(file: File, kind: UploadKind): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return saveImageBuffer(buffer, kind);
}

/** Downloads an external image (e.g. an IGDB cover) and stores it through the same pipeline. */
export async function saveImageFromUrl(url: string, kind: UploadKind): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new UploadValidationError(`Failed to download image (${res.status}).`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return saveImageBuffer(buffer, kind);
}

export function resolveUploadPath(segments: string[]): string {
  // Segments come from the URL path; reject anything that could escape UPLOAD_ROOT.
  if (segments.some((s) => s.includes("..") || s.includes("/") || s.includes("\\"))) {
    throw new UploadValidationError("Invalid path.");
  }
  return path.join(UPLOAD_ROOT, ...segments);
}

/** Reads a locally-stored upload back out as base64, for bundling into a checklist export. */
export async function readUploadedImageAsBase64(url: string): Promise<string | null> {
  const match = url.match(UPLOAD_URL_PATTERN);
  if (!match) return null;
  const [, kind, filename] = match;
  try {
    const buffer = await readFile(resolveUploadPath([kind, filename]));
    return buffer.toString("base64");
  } catch {
    return null;
  }
}

/** Re-saves a base64 payload from a checklist import through the normal validation pipeline. */
export async function saveImageFromBase64(base64: string, kind: UploadKind): Promise<string> {
  const buffer = Buffer.from(base64, "base64");
  return saveImageBuffer(buffer, kind);
}

export function uploadKindFromUrl(url: string): UploadKind | null {
  const match = url.match(UPLOAD_URL_PATTERN);
  return (match?.[1] as UploadKind) ?? null;
}

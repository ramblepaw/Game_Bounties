"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUploadedImage, saveImageFromUrl, UploadValidationError } from "@/lib/uploads";

const gameSchema = z.object({
  title: z.string().min(1, "Title is required."),
  sortTitle: z.string().optional(),
  platform: z.string().optional(),
  releaseYear: z.string().optional(),
  notes: z.string().optional(),
  igdbId: z.string().optional(),
  summary: z.string().optional(),
  genres: z.string().optional(),
  igdbCoverImageUrl: z.string().optional(),
  secondaryTitle: z.string().optional(),
  igdbSecondaryCoverImageUrl: z.string().optional(),
});

export type GameFormState = { error: string | null };

export async function createGame(
  _prevState: GameFormState,
  formData: FormData,
): Promise<GameFormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = gameSchema.safeParse({
    title: formData.get("title"),
    sortTitle: formData.get("sortTitle"),
    platform: formData.get("platform"),
    releaseYear: formData.get("releaseYear"),
    notes: formData.get("notes"),
    igdbId: formData.get("igdbId"),
    summary: formData.get("summary"),
    genres: formData.get("genres"),
    igdbCoverImageUrl: formData.get("igdbCoverImageUrl"),
    secondaryTitle: formData.get("secondaryTitle"),
    igdbSecondaryCoverImageUrl: formData.get("igdbSecondaryCoverImageUrl"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let coverImageUrl: string | undefined;
  const coverFile = formData.get("coverImage");
  let secondaryCoverImageUrl: string | undefined;
  const secondaryCoverFile = formData.get("secondaryCoverImage");
  try {
    if (coverFile instanceof File && coverFile.size > 0) {
      // A manually chosen file always wins over the IGDB-selected cover.
      coverImageUrl = await saveUploadedImage(coverFile, "covers");
    } else if (parsed.data.igdbCoverImageUrl) {
      coverImageUrl = await saveImageFromUrl(parsed.data.igdbCoverImageUrl, "covers");
    }
    if (secondaryCoverFile instanceof File && secondaryCoverFile.size > 0) {
      secondaryCoverImageUrl = await saveUploadedImage(secondaryCoverFile, "covers");
    } else if (parsed.data.igdbSecondaryCoverImageUrl) {
      secondaryCoverImageUrl = await saveImageFromUrl(parsed.data.igdbSecondaryCoverImageUrl, "covers");
    }
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return { error: err.message };
    }
    throw err;
  }

  const game = await db.game.create({
    data: {
      title: parsed.data.title,
      sortTitle: parsed.data.sortTitle || null,
      platform: parsed.data.platform || null,
      releaseYear: parsed.data.releaseYear ? Number(parsed.data.releaseYear) : null,
      notes: parsed.data.notes || null,
      igdbId: parsed.data.igdbId ? Number(parsed.data.igdbId) : null,
      summary: parsed.data.summary || null,
      genres: parsed.data.genres || null,
      coverImageUrl,
      secondaryTitle: parsed.data.secondaryTitle || null,
      secondaryCoverImageUrl,
    },
  });

  revalidatePath("/", "layout");
  redirect(`/games/${game.id}`);
}

export async function updateGame(
  gameId: string,
  _prevState: GameFormState,
  formData: FormData,
): Promise<GameFormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = gameSchema.safeParse({
    title: formData.get("title"),
    sortTitle: formData.get("sortTitle"),
    platform: formData.get("platform"),
    releaseYear: formData.get("releaseYear"),
    notes: formData.get("notes"),
    igdbId: formData.get("igdbId"),
    summary: formData.get("summary"),
    genres: formData.get("genres"),
    igdbCoverImageUrl: formData.get("igdbCoverImageUrl"),
    secondaryTitle: formData.get("secondaryTitle"),
    igdbSecondaryCoverImageUrl: formData.get("igdbSecondaryCoverImageUrl"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let coverImageUrl: string | undefined;
  const coverFile = formData.get("coverImage");
  let secondaryCoverImageUrl: string | undefined;
  const secondaryCoverFile = formData.get("secondaryCoverImage");
  try {
    if (coverFile instanceof File && coverFile.size > 0) {
      coverImageUrl = await saveUploadedImage(coverFile, "covers");
    } else if (parsed.data.igdbCoverImageUrl) {
      coverImageUrl = await saveImageFromUrl(parsed.data.igdbCoverImageUrl, "covers");
    }
    if (secondaryCoverFile instanceof File && secondaryCoverFile.size > 0) {
      secondaryCoverImageUrl = await saveUploadedImage(secondaryCoverFile, "covers");
    } else if (parsed.data.igdbSecondaryCoverImageUrl) {
      secondaryCoverImageUrl = await saveImageFromUrl(parsed.data.igdbSecondaryCoverImageUrl, "covers");
    }
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return { error: err.message };
    }
    throw err;
  }

  await db.game.update({
    where: { id: gameId },
    data: {
      title: parsed.data.title,
      sortTitle: parsed.data.sortTitle || null,
      platform: parsed.data.platform || null,
      releaseYear: parsed.data.releaseYear ? Number(parsed.data.releaseYear) : null,
      notes: parsed.data.notes || null,
      secondaryTitle: parsed.data.secondaryTitle || null,
      // Only touch IGDB metadata/cover if this submission actually made a
      // fresh selection -- otherwise leave whatever was already saved alone.
      ...(parsed.data.igdbId
        ? {
            igdbId: Number(parsed.data.igdbId),
            summary: parsed.data.summary || null,
            genres: parsed.data.genres || null,
          }
        : {}),
      ...(coverImageUrl ? { coverImageUrl } : {}),
      ...(secondaryCoverImageUrl ? { secondaryCoverImageUrl } : {}),
    },
  });

  revalidatePath("/", "layout");
  redirect(`/games/${gameId}`);
}

export async function deleteGame(gameId: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  await db.game.delete({ where: { id: gameId } });
  revalidatePath("/", "layout");
  redirect("/games");
}

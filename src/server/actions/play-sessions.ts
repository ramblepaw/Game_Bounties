"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export type SessionActionState = { error: string | null };

export async function startSession(
  checklistId: string,
  _prevState: SessionActionState,
  _formData: FormData,
): Promise<SessionActionState> {
  const session = await requireSession();

  const active = await db.playSession.findFirst({
    where: { userId: session.userId, endedAt: null },
  });
  if (active) {
    return { error: "You already have an active session running. Stop it first." };
  }

  await db.playSession.create({
    data: { checklistId, userId: session.userId, startedAt: new Date() },
  });

  revalidatePath("/", "layout");
  return { error: null };
}

export async function stopSession(sessionId: string): Promise<void> {
  const session = await requireSession();

  const active = await db.playSession.findUniqueOrThrow({ where: { id: sessionId } });
  if (active.userId !== session.userId) throw new Error("Not your session.");
  if (active.endedAt) return;

  const endedAt = new Date();
  const durationMinutes = Math.max(
    1,
    Math.round((endedAt.getTime() - active.startedAt.getTime()) / 60000),
  );

  await db.playSession.update({
    where: { id: sessionId },
    data: { endedAt, durationMinutes },
  });

  revalidatePath("/", "layout");
}

const manualEntrySchema = z.object({
  checklistId: z.string().min(1),
  date: z.string().min(1, "Date is required."),
  hours: z.string().optional(),
  minutes: z.string().optional(),
  notes: z.string().optional(),
});

export type ManualEntryState = { error: string | null };

export async function createManualSession(
  _prevState: ManualEntryState,
  formData: FormData,
): Promise<ManualEntryState> {
  const session = await requireSession();

  const parsed = manualEntrySchema.safeParse({
    checklistId: formData.get("checklistId"),
    date: formData.get("date"),
    hours: formData.get("hours"),
    minutes: formData.get("minutes"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const hours = Number(parsed.data.hours) || 0;
  const minutes = Number(parsed.data.minutes) || 0;
  const durationMinutes = hours * 60 + minutes;
  if (durationMinutes <= 0) {
    return { error: "Enter a duration greater than zero." };
  }

  const startedAt = parseLocalDate(parsed.data.date);

  await db.playSession.create({
    data: {
      checklistId: parsed.data.checklistId,
      userId: session.userId,
      startedAt,
      endedAt: new Date(startedAt.getTime() + durationMinutes * 60000),
      durationMinutes,
      notes: parsed.data.notes || null,
      isManualEntry: true,
    },
  });

  revalidatePath("/", "layout");
  return { error: null };
}

const editSessionSchema = z.object({
  checklistId: z.string().min(1),
  date: z.string().min(1, "Date is required."),
  hours: z.string().optional(),
  minutes: z.string().optional(),
  notes: z.string().optional(),
});

export type EditSessionState = { error: string | null };

/** Corrects an existing session (wrong checklist/duration/date/notes, or one left running by accident). */
export async function updateSession(
  sessionId: string,
  _prevState: EditSessionState,
  formData: FormData,
): Promise<EditSessionState> {
  await requireSession();

  const parsed = editSessionSchema.safeParse({
    checklistId: formData.get("checklistId"),
    date: formData.get("date"),
    hours: formData.get("hours"),
    minutes: formData.get("minutes"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const hours = Number(parsed.data.hours) || 0;
  const minutes = Number(parsed.data.minutes) || 0;
  const durationMinutes = hours * 60 + minutes;
  if (durationMinutes <= 0) {
    return { error: "Enter a duration greater than zero." };
  }

  const startedAt = parseLocalDate(parsed.data.date);

  await db.playSession.update({
    where: { id: sessionId },
    data: {
      checklistId: parsed.data.checklistId,
      startedAt,
      endedAt: new Date(startedAt.getTime() + durationMinutes * 60000),
      durationMinutes,
      notes: parsed.data.notes || null,
      isManualEntry: true,
    },
  });

  revalidatePath("/", "layout");
  return { error: null };
}

export async function deleteSession(sessionId: string): Promise<void> {
  await requireSession();
  await db.playSession.delete({ where: { id: sessionId } });
  revalidatePath("/", "layout");
}

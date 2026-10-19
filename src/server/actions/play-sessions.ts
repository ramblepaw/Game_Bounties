"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isRunSubmitted, SUBMITTED_RUN_LOCKED } from "@/lib/runs";
import { DEFAULT_TIMEZONE, startOfDayInTimeZone, zonedDateKey } from "@/lib/timezone";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** The timezone the viewer's session lists file days under -- a form date means that day there. */
async function viewerTimeZone(): Promise<string> {
  return (await getCurrentUser())?.timezone ?? DEFAULT_TIMEZONE;
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
  // A submitted run is finished; time spent after that isn't part of it.
  if (await isRunSubmitted(checklistId, session.userId)) {
    return { error: SUBMITTED_RUN_LOCKED };
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

  if (await isRunSubmitted(parsed.data.checklistId, session.userId)) {
    return { error: SUBMITTED_RUN_LOCKED };
  }

  const startedAt = startOfDayInTimeZone(parsed.data.date, await viewerTimeZone());

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

  // Leaving the date alone keeps the session's real start time, so fixing only
  // the duration of a timed session doesn't also move it to midnight.
  const timeZone = await viewerTimeZone();
  const existing = await db.playSession.findUnique({ where: { id: sessionId }, select: { startedAt: true } });
  const startedAt =
    existing && zonedDateKey(existing.startedAt, timeZone) === parsed.data.date
      ? existing.startedAt
      : startOfDayInTimeZone(parsed.data.date, timeZone);

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

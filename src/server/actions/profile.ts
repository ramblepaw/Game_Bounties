"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function updateActiveChecklistLimit(limit: number | null): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  await db.user.update({
    where: { id: session.userId },
    data: { activeChecklistLimit: limit },
  });
  revalidatePath("/", "layout");
}

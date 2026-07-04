"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTokenBalance } from "@/lib/token-ledger";

const purchaseSchema = z.object({
  title: z.string().min(1, "Title is required."),
  tokenCost: z.string().min(1, "Token cost is required."),
  notes: z.string().optional(),
});

export type PurchaseFormState = { error: string | null };

export async function createPurchase(
  _prevState: PurchaseFormState,
  formData: FormData,
): Promise<PurchaseFormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = purchaseSchema.safeParse({
    title: formData.get("title"),
    tokenCost: formData.get("tokenCost"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const tokenCost = Math.max(0, parseInt(parsed.data.tokenCost, 10) || 0);
  const balance = await getTokenBalance();
  if (balance < tokenCost) {
    return { error: `Not enough tokens (need ${tokenCost}, have ${balance}).` };
  }

  await db.$transaction(async (tx) => {
    const purchase = await tx.gamePurchase.create({
      data: {
        title: parsed.data.title,
        tokenCost,
        notes: parsed.data.notes || null,
        purchasedById: session.userId,
      },
    });
    await tx.tokenTransaction.create({
      data: {
        type: "SPEND_PURCHASE",
        amount: -tokenCost,
        actorId: session.userId,
        gamePurchaseId: purchase.id,
        reason: `Bought ${parsed.data.title}`,
      },
    });
  });

  revalidatePath("/", "layout");
  return { error: null };
}

export async function deletePurchase(purchaseId: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  await db.$transaction([
    db.tokenTransaction.deleteMany({ where: { gamePurchaseId: purchaseId } }),
    db.gamePurchase.delete({ where: { id: purchaseId } }),
  ]);

  revalidatePath("/", "layout");
}

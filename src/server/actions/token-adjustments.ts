"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTokenBalance } from "@/lib/token-ledger";

const adjustmentSchema = z.object({
  amount: z.string().min(1, "Enter an amount."),
  // Required rather than optional: an adjustment has no checklist or purchase
  // behind it explaining where the tokens came from, so the note is the only
  // record of why the balance moved.
  reason: z.string().min(1, "Give a reason — it's the only record of why this changed."),
});

export type AdjustmentFormState = { error: string | null; success: string | null };

/**
 * Writes a manual ADJUSTMENT to the ledger. The type already existed in the
 * schema but nothing ever created one, so tokens could only arrive by having a
 * checklist completion approved. This covers the cases the app doesn't model --
 * carrying over a balance from before, or house rules like a second player's
 * completion being worth more, which aren't worth encoding as logic.
 */
export async function adjustTokens(
  _prevState: AdjustmentFormState,
  formData: FormData,
): Promise<AdjustmentFormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = adjustmentSchema.safeParse({
    amount: formData.get("amount"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: null };
  }

  const amount = parseInt(parsed.data.amount, 10);
  if (Number.isNaN(amount) || amount === 0) {
    return { error: "Enter a whole number of tokens, positive or negative.", success: null };
  }

  // Same floor the purchase flow enforces -- a negative balance isn't a state
  // the rest of the app is written to handle.
  const balance = await getTokenBalance();
  if (balance + amount < 0) {
    return {
      error: `That would take the balance below zero (have ${balance}, so at most -${balance}).`,
      success: null,
    };
  }

  await db.tokenTransaction.create({
    data: {
      type: "ADJUSTMENT",
      amount,
      actorId: session.userId,
      reason: parsed.data.reason,
    },
  });

  // Layout-wide: the balance is shown in the nav bar on every page.
  revalidatePath("/", "layout");
  return {
    error: null,
    success: `${amount > 0 ? "Added" : "Removed"} ${Math.abs(amount)} 🪙 — balance is now ${balance + amount}.`,
  };
}

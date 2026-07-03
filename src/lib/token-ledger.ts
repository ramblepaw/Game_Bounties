import "server-only";
import { db } from "@/lib/db";

/** Shared household token balance, derived from the transaction ledger. */
export async function getTokenBalance(): Promise<number> {
  const result = await db.tokenTransaction.aggregate({
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

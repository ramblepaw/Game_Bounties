import "server-only";
import { db } from "@/lib/db";

export async function listPurchases() {
  return db.gamePurchase.findMany({
    orderBy: { purchasedAt: "desc" },
    include: { purchasedBy: true, game: true },
  });
}

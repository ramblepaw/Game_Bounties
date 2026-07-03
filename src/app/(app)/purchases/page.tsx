import { db } from "@/lib/db";
import { listPurchases } from "@/server/queries/purchases";
import { getTokenBalance } from "@/lib/token-ledger";
import { PurchaseForm } from "./purchase-form";
import { PurchaseList } from "./purchase-list";

export default async function PurchasesPage() {
  const [games, purchases, balance] = await Promise.all([
    db.game.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    listPurchases(),
    getTokenBalance(),
  ]);

  const totalSpent = purchases.reduce((sum, p) => sum + p.tokenCost, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-violet-950 dark:text-violet-100">Purchases</h1>
        <div className="flex gap-4 text-sm">
          <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            🪙 {balance} available
          </span>
          <span className="rounded-full bg-violet-100 px-3 py-1 font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
            {totalSpent} spent all-time
          </span>
        </div>
      </div>

      <p className="text-sm text-neutral-500">
        Log a game here whenever you buy one — this is separate from your games library, since
        buying a game doesn&apos;t mean it has a checklist yet (or ever will).
      </p>

      <PurchaseForm games={games} />
      <PurchaseList purchases={purchases} />
    </div>
  );
}

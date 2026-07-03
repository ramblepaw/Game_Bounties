"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deletePurchase } from "@/server/actions/game-purchases";

type Purchase = {
  id: string;
  title: string;
  tokenCost: number;
  notes: string | null;
  purchasedAt: Date;
  purchasedBy: { displayName: string };
  game: { id: string; title: string } | null;
};

export function PurchaseList({ purchases }: { purchases: Purchase[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  if (purchases.length === 0) {
    return <p className="text-neutral-500">No purchases logged yet.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-700">
          <th className="py-2 font-medium">Game</th>
          <th className="py-2 font-medium">Bought by</th>
          <th className="py-2 font-medium">Date</th>
          <th className="py-2 font-medium">Cost</th>
          <th className="py-2 font-medium">Notes</th>
          <th className="py-2" />
        </tr>
      </thead>
      <tbody>
        {purchases.map((p) => (
          <tr key={p.id} className="border-b border-neutral-100 dark:border-neutral-800">
            <td className="py-2 font-medium">
              {p.game ? (
                <Link href={`/games/${p.game.id}`} className="text-violet-700 hover:underline">
                  {p.title}
                </Link>
              ) : (
                <span>
                  {p.title} <span className="text-xs text-neutral-400">(not tracked)</span>
                </span>
              )}
            </td>
            <td className="py-2">{p.purchasedBy.displayName}</td>
            <td className="py-2">{p.purchasedAt.toLocaleDateString()}</td>
            <td className="py-2 font-medium text-amber-600">🪙 {p.tokenCost}</td>
            <td className="py-2 text-neutral-500">{p.notes}</td>
            <td className="py-2 text-right">
              <button
                type="button"
                onClick={() => startTransition(() => deletePurchase(p.id).then(() => router.refresh()))}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

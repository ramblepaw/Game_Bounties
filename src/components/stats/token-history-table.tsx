type Transaction = {
  id: string;
  type: string;
  amount: number;
  reason: string | null;
  createdAt: Date;
  actor: { displayName: string };
};

export function TokenHistoryTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <p className="text-neutral-500">No token activity yet.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-700">
          <th className="py-2 font-medium">Date</th>
          <th className="py-2 font-medium">Player</th>
          <th className="py-2 font-medium">Type</th>
          <th className="py-2 font-medium">Amount</th>
          <th className="py-2 font-medium">Reason</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((t) => (
          <tr key={t.id} className="border-b border-neutral-100 dark:border-neutral-800">
            <td className="py-2">{t.createdAt.toLocaleDateString()}</td>
            <td className="py-2">{t.actor.displayName}</td>
            <td className="py-2">{t.type.replace("_", " ")}</td>
            <td className={`py-2 font-medium ${t.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
              {t.amount >= 0 ? `+${t.amount}` : t.amount}
            </td>
            <td className="py-2 text-neutral-500">{t.reason}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type TabRate = { game: string; checklist: string; tab: string; percent: number };

export function TabCompletionTable({ rates }: { rates: TabRate[] }) {
  if (rates.length === 0) {
    return <p className="text-neutral-500">No checklists yet.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-700">
          <th className="py-2 font-medium">Game</th>
          <th className="py-2 font-medium">Checklist</th>
          <th className="py-2 font-medium">Tab</th>
          <th className="py-2 font-medium">Completion</th>
        </tr>
      </thead>
      <tbody>
        {rates.map((r, i) => (
          <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800">
            <td className="py-2">{r.game}</td>
            <td className="py-2">{r.checklist}</td>
            <td className="py-2">{r.tab}</td>
            <td className="py-2 font-medium text-neutral-500">{r.percent}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

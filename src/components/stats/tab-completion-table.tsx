type TabRate = { tab: string; percent: number };

export function TabCompletionTable({ rates }: { rates: TabRate[] }) {
  if (rates.length === 0) {
    return null;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-violet-200 text-neutral-500 dark:border-violet-800">
          <th className="py-2 font-medium">Tab</th>
          <th className="py-2 font-medium">Completion</th>
        </tr>
      </thead>
      <tbody>
        {rates.map((r, i) => (
          <tr key={i} className="border-b border-violet-100 dark:border-violet-900">
            <td className="py-2">{r.tab}</td>
            <td className="py-2 font-medium text-neutral-500">{r.percent}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

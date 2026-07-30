"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function VelocityChart({ data, yLabel }: { data: { date: string; completed: number }[]; yLabel?: string }) {
  if (data.every((d) => d.completed === 0)) {
    return <p className="text-neutral-500">No completions logged yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: 0, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af33" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} interval={4} />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: "#9ca3af" }}
          label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft", fill: "#9ca3af" } : undefined}
        />
        <Tooltip />
        {/* `stepAfter` (not `linear`/`monotone`) so there's no diagonal ramp
            between two days -- completions on a given day happened at one
            point in time, not gradually across the gap to the next day.
            Each day's value holds flat until the next day's own value
            takes over (this is also what keeps a cumulative total reading
            as a clean staircase instead of a smoothed climb). */}
        <Line type="stepAfter" dataKey="completed" stroke="#e11d48" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

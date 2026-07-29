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
        {/* `linear` (not `monotone`) so each day reads as its own discrete value --
            a smoothed curve between points can look like minutes/completions are
            building on each other day-to-day instead of resetting each day. */}
        <Line type="linear" dataKey="completed" stroke="#e11d48" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

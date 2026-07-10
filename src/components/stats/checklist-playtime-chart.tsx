"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ChecklistPlaytimeChart({ data }: { data: { date: string; minutes: number }[] }) {
  if (data.every((d) => d.minutes === 0)) {
    return <p className="text-neutral-500">No playtime logged yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 0, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af33" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} interval={4} />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: "#9ca3af" }}
          label={{ value: "minutes", angle: -90, position: "insideLeft", fill: "#9ca3af" }}
        />
        <Tooltip />
        <Bar dataKey="minutes" fill="#7c3aed" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

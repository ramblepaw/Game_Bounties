"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function PlaytimeChart({ data }: { data: { title: string; minutes: number }[] }) {
  if (data.length === 0) {
    return <p className="text-neutral-500">No playtime logged yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 0, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af33" />
        <XAxis dataKey="title" tick={{ fontSize: 12, fill: "#9ca3af" }} />
        <YAxis
          tick={{ fontSize: 12, fill: "#9ca3af" }}
          label={{ value: "minutes", angle: -90, position: "insideLeft", fill: "#9ca3af" }}
        />
        <Tooltip />
        <Bar dataKey="minutes" fill="#7c3aed" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

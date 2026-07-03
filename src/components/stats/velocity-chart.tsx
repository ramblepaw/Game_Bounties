"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function VelocityChart({ data }: { data: { date: string; completed: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: 0, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af33" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} interval={4} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
        <Tooltip />
        <Line type="monotone" dataKey="completed" stroke="#e11d48" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { parseISODateLocal, formatShortDate } from "@/lib/format";

function tickDate(value: string): string {
  return formatShortDate(parseISODateLocal(value));
}

function labelDate(label: React.ReactNode): string {
  return typeof label === "string" ? tickDate(label) : "";
}

export function ChecklistPlaytimeChart({ data }: { data: { date: string; minutes: number }[] }) {
  if (data.every((d) => d.minutes === 0)) {
    return <p className="text-neutral-500">No playtime logged yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: 0, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af33" />
        <XAxis dataKey="date" tickFormatter={tickDate} tick={{ fontSize: 10, fill: "#9ca3af" }} interval={4} />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: "#9ca3af" }}
          label={{ value: "minutes", angle: -90, position: "insideLeft", fill: "#9ca3af" }}
        />
        <Tooltip
          labelFormatter={labelDate}
          contentStyle={{ backgroundColor: "#1e1830", border: "1px solid #4c1d95", borderRadius: 8 }}
          labelStyle={{ color: "#ede9fe", fontWeight: 600 }}
          itemStyle={{ color: "#ede9fe" }}
        />
        {/* `stepAfter` (not `linear`/`monotone`) so there's no diagonal ramp
            between two days -- a 48-minute session happened on one specific
            day, not gradually across the gap to the next one. Each day's
            value holds flat until the next day's own value takes over. */}
        <Line type="stepAfter" dataKey="minutes" stroke="#7c3aed" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

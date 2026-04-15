"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { useMemo } from "react";

interface SLAEntry {
  module_id:         string;
  incident_start:    string;
  incident_end:      string | null;
  auto_repaired:     boolean;
  repair_duration_ms: number | null;
}

interface DayBucket { date: string; incidents: number; avgMttr: number; autoRepairRate: number }

export default function SLAChart({ data }: { data: SLAEntry[] }) {
  const chartData: DayBucket[] = useMemo(() => {
    const map = new Map<string, { count: number; repaired: number; totalMs: number }>();

    data.forEach((d) => {
      const date = d.incident_start.slice(0, 10);
      const bucket = map.get(date) ?? { count: 0, repaired: 0, totalMs: 0 };
      bucket.count++;
      if (d.auto_repaired) bucket.repaired++;
      if (d.repair_duration_ms) bucket.totalMs += d.repair_duration_ms;
      map.set(date, bucket);
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { count, repaired, totalMs }]) => ({
        date:            date.slice(5), // MM-DD
        incidents:       count,
        avgMttr:         count > 0 ? Math.round(totalMs / count / 1000) : 0,
        autoRepairRate:  count > 0 ? Math.round((repaired / count) * 100) : 0,
      }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>
        No incident data yet.
      </div>
    );
  }

  const tooltipStyle = {
    backgroundColor: "#0d0d22",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
    color: "#f1f5f9",
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8", paddingTop: 12 }} />
        <Line type="monotone" dataKey="incidents"      stroke="#f43f5e" strokeWidth={2} dot={false} name="Incidents" />
        <Line type="monotone" dataKey="avgMttr"        stroke="#38bdf8" strokeWidth={2} dot={false} name="Avg MTTR (s)" />
        <Line type="monotone" dataKey="autoRepairRate" stroke="#10b981" strokeWidth={2} dot={false} name="Auto-Repair %" />
      </LineChart>
    </ResponsiveContainer>
  );
}

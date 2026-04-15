"use client";

import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";
import SLAChart  from "@/components/SLAChart";
import ActivityFeed from "@/components/ActivityFeed";
import { TrendingUp, Clock, Zap, Loader2 } from "lucide-react";

interface SLAEntry { module_id: string; incident_start: string; incident_end: string | null; auto_repaired: boolean; repair_duration_ms: number | null }

export default function AnalyticsPage() {
  const [data,    setData]    = useState<SLAEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sla")
      .then((r) => r.json())
      .then((d) => { setData(d.metrics ?? []); setLoading(false); });
  }, []);

  const resolved   = data.filter((d) => d.incident_end);
  const avgMttrMs  = resolved.length
    ? resolved.reduce((sum, d) => sum + (d.repair_duration_ms ?? 0), 0) / resolved.length
    : 0;
  const autoRepairRate = resolved.length
    ? Math.round((resolved.filter((d) => d.auto_repaired).length / resolved.length) * 100)
    : 0;

  const formatDuration = (ms: number) =>
    ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={36} color="var(--violet)" style={{ animation: "spin 1s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <MobileNav active="analytics" />
      <main style={{ flex: 1, padding: "24px 24px 100px" }}>
        <h1 style={{ fontWeight: 800, fontSize: 26, marginBottom: 8 }}>Analytics</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 32 }}>SLA metrics and auto-repair performance.</p>

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
          {[
            { icon: TrendingUp, label: "Total incidents",   value: data.length,                        color: "var(--violet-light)" },
            { icon: Zap,        label: "Auto-repair rate",  value: `${autoRepairRate}%`,               color: "var(--emerald)" },
            { icon: Clock,      label: "Avg. MTTR",         value: avgMttrMs ? formatDuration(avgMttrMs) : "—", color: "var(--sky)" },
          ].map((kpi) => (
            <div key={kpi.label} className="glass" style={{ padding: 24 }}>
              <kpi.icon size={20} color={kpi.color} style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 30, fontWeight: 900, color: kpi.color }}>{kpi.value}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="glass" style={{ padding: 24, marginBottom: 28 }}>
          <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Incident timeline</h2>
          <SLAChart data={data} />
        </div>

        {/* AI Action Logs with Feedback */}
        <div className="glass" style={{ padding: 24, marginBottom: 28 }}>
          <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Historique des décisions IA</h2>
          <ActivityFeed />
        </div>

        {/* Incident table */}
        <div className="glass" style={{ padding: 24 }}>
          <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Recent incidents</h2>
          {data.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
              <TrendingUp size={36} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
              No incidents yet — all sites healthy!
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Module ID", "Start", "Duration", "Auto-repaired"].map((col) => (
                      <th key={col} style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-muted)", fontWeight: 500 }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 50).map((row) => {
                    const dur = row.incident_end && row.repair_duration_ms
                      ? formatDuration(row.repair_duration_ms) : "ongoing";
                    return (
                      <tr key={row.module_id + row.incident_start} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "var(--text-secondary)" }}>{row.module_id.slice(0, 8)}…</td>
                        <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{new Date(row.incident_start).toLocaleString()}</td>
                        <td style={{ padding: "10px 12px" }}>{dur}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ color: row.auto_repaired ? "var(--emerald)" : "var(--rose)", fontWeight: 600 }}>
                            {row.auto_repaired ? "✓ Yes" : "✗ No"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

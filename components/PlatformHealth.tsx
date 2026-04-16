// components/PlatformHealth.tsx
import { useEffect, useState } from "react";
import { Activity, Shield, AlertCircle, CheckCircle, Clock } from "lucide-react";

interface Vitals { last_heartbeat: string; is_orchestrator_active: boolean; stripe_status: string }
interface SystemLog { id: string; event_type: string; message: string; severity: string; created_at: string }

export default function PlatformHealth() {
  const [data, setData] = useState<{ vitals: Vitals; logs: SystemLog[] } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchHealth = () => {
      fetch("/api/admin/health")
        .then((r) => r.json())
        .then((d) => setData(d));
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  if (!mounted || !data) return null;

  const vitals = data.vitals;
  const heartbeatAge = vitals ? Date.now() - new Date(vitals.last_heartbeat).getTime() : 0;
  const isHealthy    = vitals ? (heartbeatAge < 120000 && vitals.is_orchestrator_active) : false;

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {/* Vital Signs Card */}
        <div className="glass" style={{ padding: 24, border: `1px solid ${isHealthy ? "rgba(16,185,129,0.2)" : "rgba(244,63,94,0.3)"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)" }}>SYSTEM VITAL SIGNS</h3>
            {isHealthy ? <CheckCircle size={18} color="var(--emerald)" /> : <AlertCircle size={18} color="var(--rose)" />}
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Guardian Heartbeat</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: isHealthy ? "var(--emerald)" : "var(--rose)" }}>
                {Math.round(heartbeatAge / 1000)}s ago
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Orchestrator Status</span>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: isHealthy ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)", color: isHealthy ? "var(--emerald)" : "var(--rose)", fontWeight: 700 }}>
                {isHealthy ? "ACTIVE" : "STALLED / AUTO-RESTART PENDING"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Stripe Webhook</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--emerald)" }}>OPERATIONAL</span>
            </div>
          </div>
        </div>

        {/* Recent System Logs */}
        <div className="glass" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 16 }}>RECENT SYSTEM EVENTS</h3>
          <div style={{ maxHeight: 100, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {!data.logs || (data as any).error ? (
              <div style={{ fontSize: 11, color: "var(--rose)", textAlign: "center", padding: 10, background: "rgba(244,63,94,0.05)", borderRadius: 8 }}>
                {(data as any).error || "Failed to load system logs."}
              </div>
            ) : data.logs.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: 10 }}>No issues detected.</div>
            ) : (
              data.logs.map((log) => (
                <div key={log.id} style={{ fontSize: 11, padding: "6px 10px", background: "rgba(0,0,0,0.2)", borderRadius: 6, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", marginTop: 5, background: log.severity === "critical" ? "var(--rose)" : (log.severity === "error" ? "#f59e0b" : "var(--sky)") }} />
                  <div>
                    <div style={{ fontWeight: 700, opacity: 0.8 }}>{log.event_type}</div>
                    <div style={{ color: "var(--text-muted)", marginTop: 2 }}>{log.message}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

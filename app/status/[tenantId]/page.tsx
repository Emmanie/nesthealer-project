"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, AlertTriangle, Activity, Globe, Loader2 } from "lucide-react";

interface PublicModule {
  id: string;
  name: string;
  url: string;
  status: string;
  last_success: string | null;
}

export default function PublicStatusPage() {
  const params = useParams();
  const tenant_id = params.tenantId as string;

  const [modules, setModules] = useState<PublicModule[]>([]);
  const [tenantName, setTenantName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function fetchStatus() {
      try {
        const res = await fetch(`/api/status/${tenant_id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Status page not available");
        
        setModules(data.modules || []);
        setTenantName(data.tenant_name);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, [tenant_id]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#070714", color: "white" }}>
      <Loader2 className="spin" size={40} color="var(--violet)" />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#070714", color: "white", textAlign: "center", padding: 20 }}>
      <AlertTriangle size={48} color="var(--rose)" style={{ marginBottom: 16 }} />
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Status Page Unavailable</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 8 }}>{error}</p>
    </div>
  );

  const allHealthy = modules.every(m => m.status === "active");

  return (
    <div style={{ minHeight: "100vh", background: "#070714", color: "white", fontFamily: "inherit" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
        
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, var(--violet), #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{tenantName || "System"} Status</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Real-time service availability</p>
          </div>
        </div>

        {/* Global Summary */}
        <div style={{ 
          background: allHealthy ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)", 
          border: `1px solid ${allHealthy ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)"}`,
          borderRadius: 16, padding: "24px 32px", marginBottom: 32, display: "flex", alignItems: "center", gap: 20
        }}>
          {allHealthy ? (
            <CheckCircle size={32} color="var(--emerald)" />
          ) : (
            <AlertTriangle size={32} color="var(--amber)" />
          )}
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: allHealthy ? "var(--emerald)" : "var(--amber)" }}>
              {allHealthy ? "All Systems Operational" : "Partial Service Disruption"}
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Last updated: {mounted ? new Date().toLocaleTimeString() : "—"}
            </p>
          </div>
        </div>

        {/* Module List */}
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
          Services
        </h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {modules.map(mod => {
            const isActive = mod.status === "active";
            return (
              <div key={mod.id} className="glass" style={{ padding: "16px 20px", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Globe size={18} color="var(--text-muted)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{mod.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{new URL(mod.url).hostname}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: isActive ? "var(--emerald)" : "var(--rose)" }}>
                    {isActive ? "Operational" : "Degraded Performance"}
                  </span>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: isActive ? "var(--emerald)" : "var(--rose)", boxShadow: isActive ? "0 0 8px var(--emerald-glow)" : "0 0 8px var(--rose-glow)" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 60, textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24 }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Powered by <strong style={{ color: "var(--violet-light)" }}>NeatHealer</strong> Self-Healing SaaS
          </p>
        </div>

      </div>
    </div>
  );
}

// components/SiteDiagnostics.tsx
import { useState, useEffect } from "react";
import { AlertTriangle, Zap, Activity, Shield, Stethoscope, Eye, Loader2, Play } from "lucide-react";
import StatusBadge from "./StatusBadge";

interface ManagedSite {
  id: string;
  name: string;
  url: string;
  status: string;
  autonomy_level: string;
  tenants: { name: string };
}

export default function SiteDiagnostics() {
  const [sites, setSites] = useState<ManagedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  const loadSites = async () => {
    try {
      const res = await fetch("/api/admin/sites");
      const data = await res.json();
      setSites(data.sites || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  const injectFailure = async (moduleId: string, type: string) => {
    setActioning(`${moduleId}-${type}`);
    try {
      const res = await fetch("/api/admin/debug/failure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_id: moduleId, type }),
      });
      if (res.ok) {
        alert("Chaos Injected! Check the client dashboard for AI Surgeon response.");
        loadSites();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActioning(null);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}><Loader2 className="animate-spin" size={24} /></div>;

  return (
    <div className="glass" style={{ padding: 24, marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Zap size={20} color="var(--amber)" />
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>Platform Diagnostics & Chaos Mode</h2>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", textAlign: "left" }}>
              <th style={{ padding: "12px 8px" }}>Site / Owner</th>
              <th style={{ padding: "12px 8px" }}>Status</th>
              <th style={{ padding: "12px 8px" }}>Mode</th>
              <th style={{ padding: "12px 8px" }}>Chaos Control</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => (
              <tr key={site.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "16px 8px" }}>
                  <div style={{ fontWeight: 600 }}>{site.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Owner: {site.tenants?.name}</div>
                </td>
                <td style={{ padding: "16px 8px" }}>
                  <StatusBadge status={site.status} />
                </td>
                <td style={{ padding: "16px 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {site.autonomy_level === "surgeon" ? <Stethoscope size={14} color="var(--violet)" /> : 
                     site.autonomy_level === "guardian" ? <Shield size={14} color="var(--emerald)" /> : 
                     <Eye size={14} color="var(--sky)" />}
                    {site.autonomy_level}
                  </div>
                </td>
                <td style={{ padding: "16px 8px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button 
                      onClick={() => injectFailure(site.id, "db_lock")}
                      disabled={!!actioning}
                      className="btn-secondary"
                      style={{ padding: "6px 10px", fontSize: 11, background: "rgba(244,63,94,0.1)", color: "var(--rose)", border: "1px solid rgba(244,63,94,0.2)" }}
                    >
                      {actioning === `${site.id}-db_lock` ? <Loader2 size={12} className="animate-spin" /> : "DB Lock"}
                    </button>
                    <button 
                      onClick={() => injectFailure(site.id, "timeout")}
                      disabled={!!actioning}
                      className="btn-secondary"
                      style={{ padding: "6px 10px", fontSize: 11, background: "rgba(245,158,11,0.1)", color: "var(--amber)", border: "1px solid rgba(245,158,11,0.2)" }}
                    >
                      {actioning === `${site.id}-timeout` ? <Loader2 size={12} className="animate-spin" /> : "Timeout"}
                    </button>
                    <button 
                      onClick={() => injectFailure(site.id, "broken_code")}
                      disabled={!!actioning}
                      className="btn-secondary"
                      style={{ padding: "6px 10px", fontSize: 11 }}
                    >
                      {actioning === `${site.id}-broken_code` ? <Loader2 size={12} className="animate-spin" /> : "500 Error"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

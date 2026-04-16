"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import PlatformHealth from "@/components/PlatformHealth";
import SiteDiagnostics from "@/components/SiteDiagnostics";
import { ShieldCheck, Loader2, AlertTriangle, Zap, ArrowLeft } from "lucide-react";

interface Tenant { id: string; name: string; plan: string; custom_limit?: number; created_at: string }

export default function AdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [plan,    setPlan]    = useState("");
  const [limit,   setLimit]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState("");

  useEffect(() => {
    setMounted(true);
    // Only super-admins should reach this screen — enforced by service role key check in API
    fetch("/api/admin/plan").then((r) => r.json()).then((d) => { setTenants(d.tenants ?? []); setLoading(false); });
  }, []);

  const save = async (tenantId: string) => {
    setSaving(true); setMsg("");
    const res = await fetch("/api/admin/plan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, plan, custom_limit: limit ? Number(limit) : undefined }),
    });
    const data = await res.json();
    setMsg(res.ok ? "Plan updated!" : data.error ?? "Error");
    setSaving(false);
    if (res.ok) {
      setEditing(null);
      setTenants((prev) => prev.map((t) => t.id === tenantId ? { ...t, plan, custom_limit: limit ? Number(limit) : t.custom_limit } : t));
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={36} color="var(--violet)" style={{ animation: "spin 1s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <MobileNav active="admin" />
      <main style={{ flex: 1, padding: "24px 24px 100px", minWidth: 0 }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", textDecoration: "none", fontSize: 13, marginBottom: 24, width: "fit-content" }} className="btn-ghost">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <ShieldCheck size={28} color="var(--violet)" />
          <h1 style={{ fontWeight: 800, fontSize: 26 }}>Admin Panel</h1>
        </div>
        
        <PlatformHealth />

        <div style={{ marginTop: 32, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <Zap size={20} color="var(--amber)" />
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Chaos Engineering & Site Diagnostics</h2>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
          Monitor platform sites and inject synthetic failures to test resilience.
        </p>
        
        <SiteDiagnostics />

        <div style={{ marginTop: 40, marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Tenant & Plan Management</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>Manage active subscriptions and custom quotas.</p>
        </div>

        {msg && <div style={{ marginBottom: 20, padding: "10px 16px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 8, color: "var(--emerald)", fontSize: 14 }}>{msg}</div>}

        <div className="glass" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Tenant", "Plan", "Limit", "Joined", "Actions"].map((col) => (
                  <th key={col} style={{ textAlign: "left", padding: "14px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{t.id.slice(0, 12)}…</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {editing === t.id ? (
                      <select value={plan} onChange={(e) => setPlan(e.target.value)} className="input" style={{ width: 130 }}>
                        {["basic","premium","enterprise","unlimited","custom"].map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    ) : (
                      <span style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(124,58,237,0.15)", color: "var(--violet-light)", fontSize: 12, fontWeight: 600 }}>{t.plan}</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                    {editing === t.id && plan === "custom"
                      ? <input className="input" type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="Custom limit" style={{ width: 100 }} />
                      : t.custom_limit ?? "—"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: 12 }}>
                    {mounted ? new Date(t.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {editing === t.id ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => save(t.id)} className="btn-primary" disabled={saving} style={{ padding: "6px 14px", fontSize: 13 }}>
                          {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : "Save"}
                        </button>
                        <button onClick={() => setEditing(null)} className="btn-ghost" style={{ padding: "6px 14px", fontSize: 13 }}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditing(t.id); setPlan(t.plan); setLimit(String(t.custom_limit ?? "")); }} className="btn-ghost" style={{ fontSize: 13 }}>Edit plan</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

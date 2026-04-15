"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabaseClient";
import MobileNav     from "@/components/MobileNav";
import QuotaDisplay  from "@/components/QuotaDisplay";
import SiteList      from "@/components/SiteList";
import AddSiteForm   from "@/components/AddSiteForm";
import BatchImport   from "@/components/BatchImport";
import StatusBadge   from "@/components/StatusBadge";
import { Activity, Plus, Upload, RefreshCw, Loader2 } from "lucide-react";

interface Tenant { id: string; name: string; plan: string; custom_limit?: number }
interface Module  { id: string; name: string; url: string; status: string; error_count: number; last_success: string | null; last_error: string | null }

export default function DashboardPage() {
  const supabase = createClient();

  const [tenant,  setTenant]  = useState<Tenant | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd,     setShowAdd]     = useState(false);
  const [showImport,  setShowImport]  = useState(false);
  const [chaosBanner, setChaosBanner] = useState(process.env.NEXT_PUBLIC_CHAOS_MODE === "true");

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [tenantRes, modulesRes] = await Promise.all([
      fetch("/api/quota"),
      fetch("/api/modules"),
    ]);

    const tenantData  = await tenantRes.json();
    const modulesData = await modulesRes.json();

    setTenant(tenantData);
    setModules(modulesData.modules ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  // Supabase Realtime — live updates
  useEffect(() => {
    const channel = supabase
      .channel("modules-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "modules" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, load]);

  const stats = {
    total:   modules.length,
    healthy: modules.filter((m) => m.status === "active").length,
    errors:  modules.filter((m) => m.status === "error" || m.status === "circuitOpen").length,
    killed:  modules.filter((m) => m.status === "killed").length,
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={36} color="var(--violet)" style={{ animation: "spin 1s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <MobileNav active="dashboard" />

      <main style={{ flex: 1, padding: "24px 24px 100px", maxWidth: "100%", overflow: "hidden" }}>
        {/* Chaos banner */}
        {chaosBanner && (
          <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, padding: "12px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10, color: "var(--amber)", fontSize: 14 }}>
            ⚠️ <strong>Chaos Mode Active</strong> — Fault injection is enabled. This is a staging environment.
            <button onClick={() => setChaosBanner(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--amber)", cursor: "pointer", fontSize: 18 }}>×</button>
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 26, marginBottom: 4 }}>Dashboard</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              Hello, <strong style={{ color: "var(--text-primary)" }}>{tenant?.name}</strong> — {tenant?.plan} plan
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={load} className="btn-ghost" title="Refresh" style={{ padding: "10px" }}>
              <RefreshCw size={16} />
            </button>
            <button onClick={() => setShowImport(true)} className="btn-secondary" style={{ fontSize: 14 }}>
              <Upload size={15} /> Import CSV
            </button>
            <button onClick={() => setShowAdd(true)} className="btn-primary" style={{ fontSize: 14 }}>
              <Plus size={15} /> Add site
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Total sites",   value: stats.total,   color: "var(--violet-light)" },
            { label: "Healthy",       value: stats.healthy, color: "var(--emerald)" },
            { label: "Incidents",     value: stats.errors,  color: "var(--rose)" },
            { label: "Disabled",      value: stats.killed,  color: "var(--text-muted)" },
          ].map((s) => (
            <div key={s.label} className="glass" style={{ padding: "20px 24px" }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quota */}
        {tenant && (
          <div style={{ marginBottom: 28 }}>
            <QuotaDisplay used={modules.length} plan={tenant.plan as "basic"|"premium"|"enterprise"|"unlimited"|"custom"} customLimit={tenant.custom_limit} />
          </div>
        )}

        {/* Site list */}
        <SiteList modules={modules} onRefresh={load} />

        {/* Modals */}
        {showAdd    && <AddSiteForm   onClose={() => { setShowAdd(false);    load(); }} />}
        {showImport && <BatchImport   onClose={() => { setShowImport(false); load(); }} />}
      </main>
    </div>
  );
}

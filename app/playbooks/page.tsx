"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";
import { BookOpen, Plus, Trash2, CheckCircle, Loader2, ArrowLeft } from "lucide-react";

interface Playbook {
  id:          string;
  name:        string;
  conditions:  any;
  action_type: string;
  priority:    number;
}

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading]     = useState(true);

  // New playbook states
  const [name, setName]               = useState("");
  const [errCount, setErrCount]       = useState("3");
  const [actionType, setActionType]   = useState("restart");
  const [submitting, setSubmitting]   = useState(false);

  async function fetchPlaybooks() {
    setLoading(true);
    const res = await fetch("/api/playbooks");
    if (res.ok) {
      const json = await res.json();
      setPlaybooks(json.playbooks || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPlaybooks();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    
    // A simple condition rule builder mapping
    const conditions = { error_count: Number(errCount) };

    const res = await fetch("/api/playbooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, conditions, action_type: actionType, priority: 10 }),
    });

    if (res.ok) {
      setName("");
      setErrCount("3");
      fetchPlaybooks();
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/playbooks/${id}`, { method: "DELETE" });
    fetchPlaybooks();
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <MobileNav active="playbooks" />
      <main style={{ flex: 1, padding: "24px 24px 100px", minWidth: 0 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 340px", gap: 32 }}>
          <div style={{ gridColumn: "1 / -1", marginBottom: 24 }}>
            <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", textDecoration: "none", fontSize: 13, width: "fit-content" }} className="btn-ghost">
              <ArrowLeft size={14} /> Back to Dashboard
            </Link>
          </div>

          <div>
            <header style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                <BookOpen size={28} className="gradient-text" /> 
                Playbooks
              </h1>
              <p style={{ color: "var(--text-secondary)", marginTop: 6, fontSize: 15 }}>
                Créez des règles strictes qui priment sur l'Intelligence Artificielle en cas de panne.
              </p>
            </header>

            {/* Create Playbook Card */}
            <section className="glass" style={{ padding: 24, borderRadius: 16, marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Nouveau Playbook</h2>
              <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, alignItems: "end" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Nom</label>
                  <input className="input" type="text" placeholder="Ex: Auto-Restart" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Erreurs (IF)</label>
                  <input className="input" type="number" min={1} value={errCount} onChange={(e) => setErrCount(e.target.value)} required />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Action (THEN)</label>
                  <select className="input" value={actionType} onChange={(e) => setActionType(e.target.value)}>
                    <option value="restart">Restart</option>
                    <option value="repair">Repair</option>
                    <option value="rollback">Rollback</option>
                    <option value="ignore">Ignore</option>
                    <option value="kill">Kill</option>
                  </select>
                </div>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ height: 44, justifyContent: "center" }}>
                  {submitting ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                </button>
              </form>
            </section>

            {/* List */}
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Playbooks Actifs</h2>
            {loading ? (
              <div style={{ textAlign: "center", padding: 40 }}><Loader2 size={24} className="spin" /></div>
            ) : playbooks.length === 0 ? (
              <div className="glass" style={{ padding: 40, textAlign: "center", borderRadius: 16, color: "var(--text-muted)" }}>
                Aucun playbook configuré. 
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {playbooks.map(pb => (
                  <div key={pb.id} className="glass" style={{ padding: "16px 20px", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600 }}>{pb.name}</h3>
                      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Si error_count ≥ {pb.conditions?.error_count} → {pb.action_type}</div>
                    </div>
                    <button onClick={() => handleDelete(pb.id)} style={{ background: "rgba(244,63,94,0.1)", color: "var(--rose)", border: "none", width: 36, height: 36, borderRadius: 8, cursor: "pointer" }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Recommendations Sidebar */}
          <aside style={{ paddingTop: 82 }} className="desktop-only">
            <div className="glass" style={{ padding: 24, background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <CheckCircle size={18} color="var(--violet-light)" />
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>AI Recommendations</h3>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Analyse des incidents : <strong>48 résolutions réussies</strong> cette semaine. Suggéré :
              </div>
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, borderLeft: "3px solid var(--violet)" }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>Circuit Breaker</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Injecter "Kill" après 10 erreurs pour préserver vos serveurs.</div>
                </div>
                <div style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, borderLeft: "3px solid var(--emerald)" }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>Aggressive Restart</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Redémarrage immédiat sur erreurs de connectivité (503).</div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <style>{`
          @media (max-width: 900px) {
            div[style*="gridTemplateColumns"] { grid-template-columns: 1fr !important; }
            .desktop-only { display: none !important; }
          }
        `}</style>
      </main>
    </div>
  );
}

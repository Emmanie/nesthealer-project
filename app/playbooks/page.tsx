"use client";

import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";
import { BookOpen, Plus, Trash2, CheckCircle, Loader2 } from "lucide-react";

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
    <>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "12px 12px 100px", zIndex: 1 }}>
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <BookOpen size={28} className="gradient-text" /> 
            Playbooks
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 6, fontSize: 15 }}>
            Créez des règles strictes qui priment sur l'Intelligence Artificielle en cas de panne de vos sites.
          </p>
        </header>

        {/* Create Playbook Card */}
        <section className="glass" style={{ padding: 24, borderRadius: 16, marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Nouveau Playbook</h2>
          <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, alignItems: "end" }}>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Nom de la Règle</label>
              <input className="input" type="text" placeholder="Ex: Hard Restart on 3 errors" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Erreurs Consécutives (IF)</label>
              <input className="input" type="number" min={1} value={errCount} onChange={(e) => setErrCount(e.target.value)} required />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Action Forcée (THEN)</label>
              <select className="input" value={actionType} onChange={(e) => setActionType(e.target.value)}>
                <option value="restart">Restart</option>
                <option value="repair">Repair</option>
                <option value="rollback">Rollback Config</option>
                <option value="ignore">Ignore</option>
                <option value="kill">Kill Module</option>
              </select>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary" style={{ height: 44, justifyContent: "center" }}>
              {submitting ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
              Créer la Règle
            </button>
          </form>
        </section>

        {/* List */}
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Playbooks Actifs <span className="badge" style={{ verticalAlign: "middle" }}>Priorité Absolue</span></h2>
        
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}><Loader2 size={24} className="spin" style={{ color: "var(--violet)" }}/></div>
        ) : playbooks.length === 0 ? (
          <div className="glass" style={{ padding: 40, textAlign: "center", borderRadius: 16, color: "var(--text-muted)" }}>
            Aucun playbook configuré. L'IA gère 100% de la prise de décision.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {playbooks.map(pb => (
              <div key={pb.id} className="glass" style={{ padding: "16px 20px", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, color: "white" }}>{pb.name}</h3>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 12, alignItems: "center" }}>
                    <span>Si <strong>error_count ≥ {pb.conditions?.error_count ?? 1}</strong></span>
                    <span style={{ color: "var(--violet-light)", fontWeight: 700 }}>→ Exécuter {pb.action_type.toUpperCase()}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(pb.id)} style={{ background: "rgba(244,63,94,0.1)", color: "var(--rose)", border: "none", width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <MobileNav active="playbooks" />
    </>
  );
}

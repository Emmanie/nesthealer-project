// components/SurgeonQueue.tsx
import { useState, useEffect } from "react";
import { Activity, Check, X, Code, Loader2, AlertCircle } from "lucide-react";

interface PendingAction {
  id: string;
  action_type: string;
  reason: string;
  proposed_sql: string;
  created_at: string;
  modules: { name: string; url: string };
}

export default function SurgeonQueue({ onReload }: { onReload: () => void }) {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchActions = async () => {
    try {
      const res = await fetch("/api/actions/pending");
      const data = await res.json();
      setActions(data.actions || []);
    } catch (err) {
      console.error("Failed to fetch surgeries", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchActions(); }, []);

  const handleAction = async (id: string, approve: boolean) => {
    setProcessing(id);
    try {
      await fetch(`/api/actions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: approve ? "pending" : "failed" }),
      });
      setActions((prev) => prev.filter((a) => a.id !== id));
      onReload(); // Refresh site list
    } catch (err) {
      console.error("Action update failed", err);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return null;
  if (actions.length === 0) return null;

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--amber)", boxShadow: "0 0 10px var(--amber)" }} />
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>AI Surgeon Pending Approvals</h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {actions.map((act) => (
          <div key={act.id} className="glass" style={{ border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.03)" }}>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--amber)" }}>SQL REPAIR SUGGESTION</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{act.modules.name}</div>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(act.created_at).toLocaleTimeString()}</div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 16 }}>
                <AlertCircle size={14} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>{act.reason}</p>
              </div>

              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 12, marginBottom: 16, border: "1px solid var(--border)", position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "var(--text-muted)", fontSize: 11 }}>
                  <Code size={12} /> PROPOSED SQL
                </div>
                <pre style={{ margin: 0, fontSize: 12, overflowX: "auto", color: "var(--emerald)", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                  {act.proposed_sql}
                </pre>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button 
                  onClick={() => handleAction(act.id, true)} 
                  disabled={!!processing}
                  className="btn-primary" 
                  style={{ flex: 1, background: "var(--emerald)", borderColor: "var(--emerald)", gap: 8 }}
                >
                  {processing === act.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Approve Surgery
                </button>
                <button 
                  onClick={() => handleAction(act.id, false)} 
                  disabled={!!processing}
                  className="btn-ghost" 
                  style={{ flex: 1, border: "1px solid var(--border)", gap: 8 }}
                >
                  <X size={16} /> Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

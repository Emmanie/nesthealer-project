"use client";

import { useState } from "react";
import StatusBadge from "./StatusBadge";
import { Globe, Trash2, Clock, AlertCircle, ExternalLink, Loader2 } from "lucide-react";

interface Module {
  id: string; name: string; url: string; status: string;
  error_count: number; last_success: string | null; last_error: string | null;
}

export default function SiteList({ modules, onRefresh }: { modules: Module[]; onRefresh: () => void }) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirm,  setConfirm]  = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await fetch(`/api/modules/${id}`, { method: "DELETE" });
    setDeleting(null);
    setConfirm(null);
    onRefresh();
  };

  if (modules.length === 0) {
    return (
      <div className="glass" style={{ padding: 60, textAlign: "center" }}>
        <Globe size={48} color="var(--text-muted)" style={{ margin: "0 auto 16px", display: "block", opacity: 0.3 }} />
        <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 16 }}>No sites monitored yet</p>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Click "Add site" to start monitoring your first website.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4 }}>
        Monitored sites <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({modules.length})</span>
      </h2>
      {modules.map((m) => (
        <div key={m.id} className="glass" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            {/* Left: name + url */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</span>
                <StatusBadge status={m.status} />
              </div>
              <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                {m.url} <ExternalLink size={11} />
              </a>
            </div>

            {/* Right: stats + delete */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
              {m.error_count > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--rose)" }}>
                  <AlertCircle size={13} /> {m.error_count} error{m.error_count !== 1 ? "s" : ""}
                </div>
              )}
              {m.last_success && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)" }}>
                  <Clock size={12} /> {new Date(m.last_success).toLocaleTimeString()}
                </div>
              )}
              {confirm === m.id ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleDelete(m.id)} disabled={!!deleting} className="btn-danger" style={{ padding: "6px 12px", fontSize: 12 }}>
                    {deleting === m.id ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : "Delete"}
                  </button>
                  <button onClick={() => setConfirm(null)} className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirm(m.id)} className="btn-ghost" style={{ padding: "6px 10px", color: "var(--text-muted)" }}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Error detail */}
          {m.last_error && m.status === "error" && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(244,63,94,0.06)", borderRadius: 6, fontSize: 12, color: "var(--rose)", fontFamily: "monospace" }}>
              {m.last_error}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

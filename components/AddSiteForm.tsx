"use client";

import { useState } from "react";
import { X, Globe, Tag, Loader2, CheckCircle } from "lucide-react";

export default function AddSiteForm({ onClose }: { onClose: () => void }) {
  const [name,  setName]  = useState("");
  const [url,   setUrl]   = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSaving(true);

    const res  = await fetch("/api/modules", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, url }),
    });
    const data = await res.json();

    if (!res.ok) { setError(data.error ?? "Failed to add site"); setSaving(false); return; }

    setDone(true);
    setTimeout(onClose, 1200);
  };

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, backdropFilter: "blur(4px)" }} />

      {/* Modal */}
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 201, width: "min(480px, 90vw)" }}>
        <div className="glass" style={{ padding: 32, borderRadius: 16 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <h2 style={{ fontWeight: 800, fontSize: 20 }}>Add a site</h2>
            <button onClick={onClose} className="btn-ghost" style={{ padding: 8 }}><X size={18} /></button>
          </div>

          {done ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <CheckCircle size={48} color="var(--emerald)" style={{ margin: "0 auto 16px", display: "block" }} />
              <p style={{ fontWeight: 600, color: "var(--emerald)" }}>Site added! Monitoring starts in 30 seconds.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label htmlFor="site-name"><Tag size={12} style={{ display: "inline", marginRight: 5 }} />Site name</label>
                <input id="site-name" className="input" type="text" placeholder="My API" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
              </div>

              <div>
                <label htmlFor="site-url"><Globe size={12} style={{ display: "inline", marginRight: 5 }} />URL</label>
                <input id="site-url" className={`input ${error ? "error" : ""}`} type="url" placeholder="https://api.example.com" value={url} onChange={(e) => setUrl(e.target.value)} required />
              </div>

              {error && <p style={{ color: "var(--rose)", fontSize: 13, background: "rgba(244,63,94,0.08)", borderRadius: 8, padding: "10px 14px", border: "1px solid rgba(244,63,94,0.2)" }}>{error}</p>}

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 8 }}>
                <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : null}
                  {saving ? "Adding…" : "Add site"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

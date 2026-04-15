"use client";

import { useEffect, useState } from "react";
import { Key, Plus, Trash2, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";

const PROVIDERS = [
  { id: "openai",   label: "OpenAI",   color: "#10b981", hint: "sk-..." },
  { id: "claude",   label: "Claude",   color: "#a78bfa", hint: "sk-ant-..." },
  { id: "deepseek", label: "DeepSeek", color: "#38bdf8", hint: "sk-..." },
  { id: "gemini",   label: "Gemini",   color: "#f59e0b", hint: "AIza..." },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

interface SecretMeta { id: string; provider: string; created_at: string }

export default function ApiKeyManager() {
  const [secrets,  setSecrets]  = useState<SecretMeta[]>([]);
  const [adding,   setAdding]   = useState<ProviderId | null>(null);
  const [apiKey,   setApiKey]   = useState("");
  const [showKey,  setShowKey]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [msg,      setMsg]      = useState("");

  const load = async () => {
    const res  = await fetch("/api/secrets");
    const data = await res.json();
    setSecrets(data.secrets ?? []);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!adding || !apiKey.trim()) return;
    setSaving(true); setMsg("");
    const res  = await fetch("/api/secrets", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ provider: adding, api_key: apiKey }),
    });
    const data = await res.json();
    if (res.ok) { setMsg(`${adding} key saved!`); setAdding(null); setApiKey(""); load(); }
    else        { setMsg(data.error ?? "Failed to save"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await fetch(`/api/secrets/${id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  };

  const hasProvider = (p: string) => secrets.some((s) => s.provider === p);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>AI Provider Keys</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
          Add your own API keys. They're stored encrypted with AES-256-GCM and never logged.
        </p>
      </div>

      {msg && <div style={{ padding: "10px 14px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, color: "var(--emerald)", fontSize: 13 }}>{msg}</div>}

      {PROVIDERS.map((p) => {
        const stored  = secrets.find((s) => s.provider === p.id);
        const isAdding = adding === p.id;

        return (
          <div key={p.id} className="glass" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${p.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Key size={16} color={p.color} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.label}</div>
                  {stored
                    ? <div style={{ fontSize: 12, color: "var(--emerald)", display: "flex", alignItems: "center", gap: 4 }}><CheckCircle size={12} /> Key saved — {new Date(stored.created_at).toLocaleDateString()}</div>
                    : <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No key configured</div>
                  }
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {stored && (
                  <button onClick={() => handleDelete(stored.id)} disabled={!!deleting} className="btn-danger" style={{ padding: "6px 12px", fontSize: 13 }}>
                    {deleting === stored.id ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={13} />}
                  </button>
                )}
                <button onClick={() => { setAdding(isAdding ? null : p.id); setApiKey(""); setShowKey(false); }} className={isAdding ? "btn-ghost" : "btn-secondary"} style={{ padding: "6px 14px", fontSize: 13 }}>
                  {isAdding ? "Cancel" : stored ? "Replace" : <><Plus size={13} /> Add key</>}
                </button>
              </div>
            </div>

            {isAdding && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                <label>API key <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({p.hint})</span></label>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <input className="input" type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={p.hint} style={{ paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowKey(!showKey)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                      {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <button onClick={handleAdd} disabled={saving || !apiKey.trim()} className="btn-primary" style={{ padding: "10px 20px" }}>
                    {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

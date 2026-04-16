"use client";

import { useState } from "react";
import { X, Globe, Tag, Loader2, CheckCircle, RefreshCw, Database, Shield, Zap, AlertCircle, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

export default function AddSiteForm({ onClose }: { onClose: () => void }) {
  const [name,    setName]    = useState("");
  const [url,     setUrl]     = useState("");
  const [hookUrl, setHookUrl] = useState("");
  const [error,   setError]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const [done,    setDone]    = useState(false);

  // Supabase Connector State
  const [showAdvanced, setAdvanced] = useState(false);
  const [subLevel, setSubLevel] = useState<"none" | "anon" | "service" | "custom">("none");
  const [subUrl, setSubUrl] = useState("");
  const [subKey, setSubKey] = useState("");
  const [termsAccepted, setTerms] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subLevel !== "none" && !termsAccepted) {
      setError("You must accept the terms to enable Supabase deep monitoring.");
      return;
    }
    setError(""); setSaving(true);

    const res  = await fetch("/api/modules", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ 
        name, 
        url, 
        cloud_restart_hook: hookUrl,
        supabase_access_level: subLevel,
        supabase_url: subUrl,
        supabase_key: subKey,
        supabase_terms_accepted: termsAccepted
      }),
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
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 201, width: "min(520px, 95vw)", maxHeight: "90vh", overflowY: "auto" }}>
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

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
                <button 
                  type="button" 
                  onClick={() => setAdvanced(!showAdvanced)} 
                  className="btn-ghost" 
                  style={{ width: "100%", justifyContent: "space-between", fontSize: 13, color: "var(--violet-light)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Shield size={14} /> Advanced: Connectors
                  </div>
                  {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showAdvanced && (
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Level Selector */}
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12, display: "block" }}>SELECT ACCESS LEVEL</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {[
                          { id: "none", label: "None", icon: X, desc: "Uptime only" },
                          { id: "anon", label: "Anon", icon: Globe, desc: "Public data only" },
                          { id: "service", label: "Surgeon", icon: Zap, desc: "Full Auto-Repair" },
                          { id: "custom", label: "Agent", icon: Database, desc: "Restricted Role" },
                        ].map((lvl) => (
                          <div 
                            key={lvl.id}
                            onClick={() => setSubLevel(lvl.id as any)}
                            style={{ 
                              padding: 12, borderRadius: 10, border: `1px solid ${subLevel === lvl.id ? "var(--violet)" : "rgba(255,255,255,0.05)"}`,
                              background: subLevel === lvl.id ? "rgba(124, 58, 237, 0.08)" : "rgba(255,255,255,0.02)",
                              cursor: "pointer", transition: "all 0.2s"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <lvl.icon size={14} color={subLevel === lvl.id ? "var(--violet-light)" : "var(--text-muted)"} />
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{lvl.label}</span>
                            </div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{lvl.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {subLevel !== "none" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div>
                          <label style={{ fontSize: 12 }}>Supabase Project URL</label>
                          <input className="input" type="url" placeholder="https://xyz.supabase.co" value={subUrl} onChange={(e) => setSubUrl(e.target.value)} required={subLevel !== "none"} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12 }}>{subLevel === "service" ? "Service Role Key" : "Access Key"}</label>
                          <input className="input" type="password" placeholder="eyJh..." value={subKey} onChange={(e) => setSubKey(e.target.value)} required={subLevel !== "none"} />
                        </div>

                        {subLevel === "custom" && (
                          <div style={{ padding: 12, background: "#000", borderRadius: 8, border: "1px solid #333" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>RESTRICTED AGENT SCRIPT (SQL)</span>
                              <button 
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText("-- NeatHealer Restricted Agent Role\nCREATE ROLE neathealer_agent WITH LOGIN PASSWORD 'YOUR_PASSWORD';\nGRANT SELECT ON ALL TABLES IN SCHEMA public TO neathealer_agent;");
                                  setCopied(true);
                                  setTimeout(() => setCopied(false), 2000);
                                }}
                                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--violet-light)" }}
                              >
                                {copied ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                            </div>
                            <code style={{ fontSize: 10, color: "var(--emerald)", display: "block", whiteSpace: "pre-wrap" }}>
                              -- Run in Supabase SQL Editor to create a safe read-only role
                            </code>
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                          <input 
                            type="checkbox" 
                            id="terms" 
                            checked={termsAccepted} 
                            onChange={(e) => setTerms(e.target.checked)} 
                            style={{ marginTop: 4 }}
                          />
                          <label htmlFor="terms" style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
                            I accept that NeatHealer stores these credentials <strong>encrypted (AES-256)</strong>. I use autonomous repair features at my own risk.
                          </label>
                        </div>
                      </div>
                    )}

                    <div>
                      <label htmlFor="site-hook"><RefreshCw size={12} style={{ display: "inline", marginRight: 5 }} />Cloud Restart Hook (Optional)</label>
                      <input id="site-hook" className="input" type="url" placeholder="https://api.vercel.com/v1/..." value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div style={{ padding: 12, background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 10, display: "flex", gap: 10, alignItems: "center" }}>
                  <AlertCircle size={16} color="var(--rose)" />
                  <p style={{ color: "var(--rose)", fontSize: 12 }}>{error}</p>
                </div>
              )}

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

"use client";

import { useEffect, useState } from "react";
import { Bell, Hash, Mail, Webhook, Loader2, CheckCircle, Globe } from "lucide-react";

interface AlertSettings {
  alert_slack_webhook: string;
  alert_email:         string;
  alert_webhook:       string;
  public_status_page:  boolean;
  id?:                 string; // tenantId for status link
}

export default function AlertConfig() {
  const [form,    setForm]    = useState<AlertSettings>({ alert_slack_webhook: "", alert_email: "", alert_webhook: "", public_status_page: false });
  const [mounted, setMounted] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState("");
  const [error,   setError]   = useState("");

  useEffect(() => {
    setMounted(true);
    fetch("/api/quota").then((r) => r.json()).then((d) => {
      setForm({
        id:                  d.id,
        alert_slack_webhook: d.alert_slack_webhook ?? "",
        alert_email:         d.alert_email ?? "",
        alert_webhook:       d.alert_webhook ?? "",
        public_status_page:  d.public_status_page ?? false,
      });
    });
  }, []);

  const handleSave = async () => {
    setSaving(true); setMsg(""); setError("");
    const res  = await fetch("/api/quota", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) setMsg("Alert settings saved!");
    else        setError(data.error ?? "Failed to save");
    setSaving(false);
  };

  const CHANNELS = [
    {
      id:    "alert_slack_webhook" as keyof AlertSettings,
      label: "Slack Webhook URL",
      icon:  Hash,
      color: "#7c3aed",
      hint:  "https://hooks.slack.com/services/...",
    },
    {
      id:    "alert_email" as keyof AlertSettings,
      label: "Alert Email",
      icon:  Mail,
      color: "#10b981",
      hint:  "alerts@yourcompany.com",
    },
    {
      id:    "alert_webhook" as keyof AlertSettings,
      label: "Custom Webhook URL",
      icon:  Bell,
      color: "#38bdf8",
      hint:  "https://your-server.com/webhook",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      
      {/* ── Public Status Page ── */}
      <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(56,189,248,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Globe size={18} color="var(--sky)" />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Public Status Page</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Show uptime publicly to your customers</p>
            </div>
          </div>
          <button 
            onClick={() => setForm(f => ({ ...f, public_status_page: !f.public_status_page }))}
            style={{
              width: 48, height: 26, borderRadius: 13, cursor: "pointer", border: "none", transition: "all 0.2s",
              background: form.public_status_page ? "var(--violet)" : "rgba(255,255,255,0.1)",
              position: "relative"
            }}
          >
            <div style={{ 
              width: 20, height: 20, borderRadius: "50%", background: "white",
              position: "absolute", top: 3, left: form.public_status_page ? 25 : 3,
              transition: "left 0.2s"
            }} />
          </button>
        </div>

        {form.public_status_page && form.id && mounted && (
          <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(124,58,237,0.05)", borderRadius: 10, border: "1px dashed rgba(124,58,237,0.2)" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Your public status URL:</div>
            <a 
              href={`/status/${form.id}`} 
              target="_blank" 
              style={{ fontSize: 13, color: "var(--violet-light)", fontWeight: 600, textDecoration: "none", wordBreak: "break-all" }}
            >
              {mounted ? window.location.origin : ""}/status/{form.id}
            </a>
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
        <h2 style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Alert Channels</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 20 }}>
          Configure where NeatHealer sends notifications when it takes an action.
        </p>
      </div>

      {msg   && <div style={{ padding: "10px 14px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, color: "var(--emerald)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}><CheckCircle size={14} /> {msg}</div>}
      {error && <div style={{ padding: "10px 14px", background: "rgba(244,63,94,0.08)",  border: "1px solid rgba(244,63,94,0.2)",  borderRadius: 8, color: "var(--rose)",    fontSize: 13 }}>{error}</div>}

      {CHANNELS.map(({ id, label, icon: Icon, color, hint }) => (
        <div key={id} className="glass" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={16} color={color} />
            </div>
            <label style={{ textTransform: "none", letterSpacing: 0, fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 0 }}>{label}</label>
            {form[id] && <CheckCircle size={14} color="var(--emerald)" />}
          </div>
          <input
            className="input"
            type={id === "alert_email" ? "email" : "url"}
            placeholder={hint}
            value={form[id]}
            onChange={(e) => setForm((prev) => ({ ...prev, [id]: e.target.value }))}
          />
        </div>
      ))}

      <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ width: "fit-content" }}>
        {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : null}
        {saving ? "Saving…" : "Save alert settings"}
      </button>
    </div>
  );
}

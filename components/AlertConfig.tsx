"use client";

import { useEffect, useState } from "react";
import { Bell, Hash, Mail, Webhook, Loader2, CheckCircle } from "lucide-react";

interface AlertSettings {
  alert_slack_webhook: string;
  alert_email:         string;
  alert_webhook:       string;
}

export default function AlertConfig() {
  const [form,   setForm]   = useState<AlertSettings>({ alert_slack_webhook: "", alert_email: "", alert_webhook: "" });
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState("");
  const [error,  setError]  = useState("");

  useEffect(() => {
    fetch("/api/quota").then((r) => r.json()).then((d) => {
      setForm({
        alert_slack_webhook: d.alert_slack_webhook ?? "",
        alert_email:         d.alert_email ?? "",
        alert_webhook:       d.alert_webhook ?? "",
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
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

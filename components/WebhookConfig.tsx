"use client";

import { useEffect, useState } from "react";
import { Webhook, Plus, Trash2, CheckCircle, Loader2 } from "lucide-react";

interface OutgoingWebhook {
  id: string;
  name: string;
  url: string;
  active: boolean;
}

export default function WebhookConfig() {
  const [webhooks, setWebhooks]       = useState<OutgoingWebhook[]>([]);
  const [loading, setLoading]         = useState(true);
  const [name, setName]               = useState("");
  const [url, setUrl]                 = useState("");
  const [submitting, setSubmitting]   = useState(false);

  async function fetchWebhooks() {
    setLoading(true);
    const res = await fetch("/api/webhooks");
    if (res.ok) {
      const json = await res.json();
      setWebhooks(json.webhooks || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchWebhooks();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url, events: ["action_result"] }),
    });
    if (res.ok) {
      setName("");
      setUrl("");
      fetchWebhooks();
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
    fetchWebhooks();
  }

  return (
    <div className="glass" style={{ borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "white", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Webhook size={18} color="var(--violet-light)" />
          Outgoing Webhooks
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
          Send automated POST requests to your external tools (Zapier, Make, Slack) whenever an AI action is executed.
        </p>
      </div>

      <div style={{ padding: 24 }}>
        <form onSubmit={handleAdd} style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <input className="input" style={{ flex: 1, minWidth: 150 }} placeholder="Webhook Name (e.g., Zapier)" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="input" style={{ flex: 2, minWidth: 200 }} placeholder="https://hooks.zapier.com/..." type="url" value={url} onChange={(e) => setUrl(e.target.value)} required />
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? <Loader2 size={16} className="spin" /> : <Plus size={16} />} Add
          </button>
        </form>

        {loading ? (
          <div style={{ padding: 20, textAlign: "center" }}><Loader2 size={24} className="spin" /></div>
        ) : webhooks.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            No outgoing webhooks configured.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {webhooks.map((wh) => (
              <div key={wh.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 8 }}>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{wh.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{wh.url}</div>
                </div>
                <button onClick={() => handleDelete(wh.id)} style={{ background: "none", border: "none", color: "var(--rose)", cursor: "pointer", padding: 8 }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

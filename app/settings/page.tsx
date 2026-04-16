"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MobileNav    from "@/components/MobileNav";
import ApiKeyManager from "@/components/ApiKeyManager";
import AlertConfig  from "@/components/AlertConfig";
import { Webhook, Settings, Key, Bell, Loader2, ArrowLeft } from "lucide-react";
import WebhookConfig from "@/components/WebhookConfig";

export default function SettingsPage() {
  const [tab, setTab] = useState<"keys" | "alerts" | "hooks">("keys");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <MobileNav active="settings" />
      <main style={{ flex: 1, padding: "24px 24px 100px", maxWidth: 720 }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", textDecoration: "none", fontSize: 13, marginBottom: 24, width: "fit-content" }} className="btn-ghost">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <h1 style={{ fontWeight: 800, fontSize: 26, marginBottom: 8 }}>Settings</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 32 }}>
          Configure your AI keys and alert channels.
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 4, width: "fit-content" }}>
          {([
            { id: "keys",   label: "API Keys", icon: Key },
            { id: "alerts", label: "Alert Config",   icon: Bell },
            { id: "hooks",  label: "Webhooks", icon: Webhook },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as typeof tab)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                fontWeight: 600, fontSize: 14, transition: "all 0.2s",
                background: tab === id ? "rgba(124,58,237,0.25)" : "transparent",
                color: tab === id ? "var(--violet-light)" : "var(--text-muted)",
              }}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {tab === "keys"   && <ApiKeyManager />}
        {tab === "alerts" && <AlertConfig />}
        {tab === "hooks"  && <WebhookConfig />}
      </main>
    </div>
  );
}

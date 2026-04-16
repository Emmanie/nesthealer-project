"use client";

import { getPlanLimit, type Plan } from "@/lib/planLimits";

interface Props {
  used:        number;
  plan:        Plan;
  customLimit?: number | null;
}

export default function QuotaDisplay({ used, plan, customLimit }: Props) {
  const limit   = getPlanLimit(plan, customLimit);
  const pct     = Math.min((used / limit) * 100, 100);
  const isNear  = pct >= 80;
  const isFull  = pct >= 100;

  const color = isFull ? "var(--rose)" : isNear ? "var(--amber)" : "var(--violet)";
  const glow  = isFull ? "var(--rose-glow)" : isNear ? "var(--amber-glow)" : "var(--violet-glow)";

  return (
    <div className="glass" style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Site quota
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>
          {used} / {limit >= 999_999 ? "∞" : limit}
          {isFull && (
            <span style={{ marginLeft: 8, fontSize: 11, color: "var(--rose)", background: "rgba(244,63,94,0.12)", padding: "2px 8px", borderRadius: 4 }}>LIMIT REACHED</span>
          )}
        </span>
      </div>
      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 6, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: 6,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          boxShadow: `0 0 10px ${glow}`,
          transition: "width 0.6s ease",
        }} />
      </div>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Basic"} plan
          {isNear && !isFull && <span style={{ marginLeft: 8, color: "var(--amber)" }}>— almost full</span>}
        </div>
        <button 
          onClick={async () => {
            const res = await fetch("/api/stripe/portal", { method: "POST" });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else alert(data.error || "Could not open billing portal");
          }}
          className="btn-ghost" 
          style={{ padding: "4px 8px", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}
        >
          Manage Billing
        </button>
      </div>
    </div>
  );
}

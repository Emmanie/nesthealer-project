"use client";

type Status = "active" | "error" | "restarting" | "circuitOpen" | "killed";

const CONFIG: Record<Status, { label: string; bg: string; color: string; dot: string }> = {
  active:      { label: "Healthy",      bg: "rgba(16,185,129,0.12)",  color: "var(--emerald)", dot: "var(--emerald)" },
  error:       { label: "Error",        bg: "rgba(244,63,94,0.12)",   color: "var(--rose)",    dot: "var(--rose)"    },
  restarting:  { label: "Restarting",   bg: "rgba(245,158,11,0.12)",  color: "var(--amber)",   dot: "var(--amber)"   },
  circuitOpen: { label: "Circuit Open", bg: "rgba(245,158,11,0.12)",  color: "var(--amber)",   dot: "var(--amber)"   },
  killed:      { label: "Disabled",     bg: "rgba(100,100,120,0.12)", color: "var(--text-muted)", dot: "var(--text-muted)" },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status as Status] ?? CONFIG.error;
  const isPulsing = status === "active" || status === "restarting";

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
      whiteSpace: "nowrap",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: cfg.dot,
        boxShadow: isPulsing ? `0 0 8px ${cfg.dot}` : "none",
        animation: isPulsing ? "pulse-glow 2s ease-in-out infinite" : "none",
        flexShrink: 0,
      }} />
      {cfg.label}
    </span>
  );
}

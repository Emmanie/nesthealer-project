// components/AutonomySwitch.tsx
import { useState } from "react";
import { Eye, Shield, Stethoscope, Lock, Loader2 } from "lucide-react";

type AutonomyLevel = "advisor" | "guardian" | "surgeon";

interface Props {
  moduleId: string;
  initialLevel: AutonomyLevel;
  userPlan: string;
  onUpdate: () => void;
}

export default function AutonomySwitch({ moduleId, initialLevel, userPlan, onUpdate }: Props) {
  const [level, setLevel] = useState<AutonomyLevel>(initialLevel);
  const [loading, setLoading] = useState(false);

  const updateLevel = async (newLevel: AutonomyLevel) => {
    if (newLevel === "surgeon" && userPlan === "basic") return;
    if (newLevel === level) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/modules/${moduleId}/autonomy`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autonomy_level: newLevel }),
      });
      if (res.ok) {
        setLevel(newLevel);
        onUpdate();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const modes: { id: AutonomyLevel; label: string; icon: any; color: string }[] = [
    { id: "advisor",  label: "Advisor",  icon: Eye,         color: "var(--sky)" },
    { id: "guardian", label: "Guardian", icon: Shield,      color: "var(--emerald)" },
    { id: "surgeon",  label: "Surgeon",  icon: Stethoscope, color: "var(--violet)" },
  ];

  return (
    <div style={{ display: "flex", background: "rgba(0,0,0,0.2)", padding: 4, borderRadius: 10, border: "1px solid var(--border)", width: "fit-content" }}>
      {modes.map((mode) => {
        const isActive = level === mode.id;
        const isLocked = mode.id === "surgeon" && userPlan === "basic";
        
        return (
          <button
            key={mode.id}
            onClick={() => updateLevel(mode.id)}
            disabled={loading || isLocked}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: "none",
              cursor: isLocked ? "not-allowed" : "pointer",
              background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
              color: isActive ? mode.color : "var(--text-muted)",
              fontSize: 12,
              fontWeight: 600,
              transition: "all 0.2s ease",
              opacity: isLocked ? 0.4 : 1,
              position: "relative"
            }}
          >
            {loading && isActive ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <mode.icon size={14} color={isActive ? mode.color : "currentColor"} />
            )}
            {mode.label}
            {isLocked && (
              <Lock size={10} style={{ marginLeft: 2, opacity: 0.6 }} />
            )}
            {isActive && (
              <div style={{ position: "absolute", bottom: -4, left: "20%", right: "20%", height: 2, background: mode.color, borderRadius: 2 }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

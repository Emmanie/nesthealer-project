"use client";

import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";

interface ActionLog {
  id: string;
  module_id: string;
  action_type: string;
  result: string;
  created_at: string;
  feedback?: boolean | null; // null = unvoted, true = good, false = bad
}

export default function ActivityFeed() {
  const [logs, setLogs]       = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchLogs() {
    setLoading(true);
    // Use an API route to fetch latest actions with its feedback
    const res = await fetch("/api/activity");
    if (res.ok) {
      const json = await res.json();
      setLogs(json.logs || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  async function vote(action_log_id: string, module_id: string, feedback: boolean) {
    // Optimistic UI update
    setLogs(prev => prev.map(log => log.id === action_log_id ? { ...log, feedback } : log));

    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action_log_id, module_id, feedback }),
    });
  }

  if (loading) return <div style={{ padding: 20, textAlign: "center" }}><Loader2 className="spin" size={24} /></div>;

  if (logs.length === 0) return (
    <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>
      No automated actions have been taken yet.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {logs.map(log => {
        const isGood = log.feedback === true;
        const isBad  = log.feedback === false;
        return (
          <div key={log.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.2)", padding: 16, borderRadius: 8 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                <span style={{ color: "var(--violet-light)", textTransform: "capitalize" }}>{log.action_type}</span> Action
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                Result: {log.result}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button 
                title="This was a genius move"
                onClick={() => vote(log.id, log.module_id, true)} 
                style={{ 
                  background: isGood ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.05)", 
                  color: isGood ? "var(--emerald)" : "var(--text-muted)", 
                  border: "none", padding: 8, borderRadius: 6, cursor: "pointer",
                  transition: "all 0.2s"
                }}
              ><ThumbsUp size={16} /></button>

              <button 
                title="This was a bad decision"
                onClick={() => vote(log.id, log.module_id, false)} 
                style={{ 
                  background: isBad ? "rgba(244, 63, 94, 0.2)" : "rgba(255,255,255,0.05)", 
                  color: isBad ? "var(--rose)" : "var(--text-muted)", 
                  border: "none", padding: 8, borderRadius: 6, cursor: "pointer",
                  transition: "all 0.2s"
                }}
              ><ThumbsDown size={16} /></button>
            </div>
          </div>
        )
      })}
    </div>
  );
}

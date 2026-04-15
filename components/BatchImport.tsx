"use client";

import { useState, useRef } from "react";
import { X, Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function BatchImport({ onClose }: { onClose: () => void }) {
  const [text,    setText]    = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<{ succeeded: number; failed: number; errors: { row: number; name: string; url: string; error: string }[] } | null>(null);
  const [error,   setError]   = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const parseRows = (raw: string) =>
    raw.trim().split("\n").filter(Boolean).map((line) => {
      const [name, ...rest] = line.split(",");
      return { name: name?.trim(), url: rest.join(",").trim() };
    });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setText(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    const rows = parseRows(text);
    if (!rows.length) { setError("No rows found."); setLoading(false); return; }

    const res  = await fetch("/api/batch-import", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ rows }),
    });
    const data = await res.json();

    if (!res.ok) { setError(data.error ?? "Import failed"); setLoading(false); return; }

    // Poll until done
    let jobId = data.import_id;
    let attempts = 0;
    const poll = async () => {
      if (attempts++ > 30) { setError("Import timed out"); setLoading(false); return; }
      const r   = await fetch(`/api/batch-import/${jobId}`);
      const job = await r.json();
      if (job.status === "done" || job.status === "failed") {
        setResult({ succeeded: job.succeeded, failed: job.failed, errors: job.errors ?? [] });
        setLoading(false);
      } else {
        setTimeout(poll, 1500);
      }
    };
    poll();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, backdropFilter: "blur(4px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 201, width: "min(540px, 90vw)" }}>
        <div className="glass" style={{ padding: 32, borderRadius: 16, maxHeight: "85vh", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontWeight: 800, fontSize: 20 }}>Batch import sites</h2>
            <button onClick={onClose} className="btn-ghost" style={{ padding: 8 }}><X size={18} /></button>
          </div>

          {result ? (
            <div>
              <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                <div style={{ flex: 1, textAlign: "center", padding: 20, background: "rgba(16,185,129,0.08)", borderRadius: 10, border: "1px solid rgba(16,185,129,0.2)" }}>
                  <CheckCircle size={28} color="var(--emerald)" style={{ margin: "0 auto 8px", display: "block" }} />
                  <div style={{ fontSize: 26, fontWeight: 900, color: "var(--emerald)" }}>{result.succeeded}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Imported</div>
                </div>
                {result.failed > 0 && (
                  <div style={{ flex: 1, textAlign: "center", padding: 20, background: "rgba(244,63,94,0.08)", borderRadius: 10, border: "1px solid rgba(244,63,94,0.2)" }}>
                    <AlertCircle size={28} color="var(--rose)" style={{ margin: "0 auto 8px", display: "block" }} />
                    <div style={{ fontSize: 26, fontWeight: 900, color: "var(--rose)" }}>{result.failed}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Failed</div>
                  </div>
                )}
              </div>
              {result.errors.length > 0 && (
                <div style={{ fontSize: 12, fontFamily: "monospace" }}>
                  {result.errors.map((e) => (
                    <div key={e.row} style={{ padding: "6px 10px", background: "rgba(244,63,94,0.06)", borderRadius: 6, marginBottom: 4, color: "var(--rose)" }}>
                      Row {e.row}: {e.name} | {e.url} — {e.error}
                    </div>
                  ))}
                </div>
              )}
              <button onClick={onClose} className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 20 }}>Done</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                One line per site: <code style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>Site Name,https://example.com</code>
              </p>

              <div>
                <label>Paste CSV or paste manually</label>
                <textarea
                  className="input"
                  rows={8}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={"My API,https://api.example.com\nMy Shop,https://shop.example.com"}
                  style={{ resize: "vertical", fontFamily: "monospace", fontSize: 13 }}
                />
              </div>

              <div style={{ textAlign: "center" }}>
                <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: "none" }} />
                <button onClick={() => fileRef.current?.click()} className="btn-ghost" style={{ gap: 8 }}>
                  <FileText size={15} /> Upload CSV file
                </button>
              </div>

              {error && <p style={{ color: "var(--rose)", fontSize: 13 }}>{error}</p>}

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button onClick={onClose} className="btn-ghost">Cancel</button>
                <button onClick={handleSubmit} disabled={loading || !text.trim()} className="btn-primary">
                  {loading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={15} />}
                  {loading ? "Importing…" : "Import"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

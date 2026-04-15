"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Activity, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

function LoginForm() {
  const router       = useRouter();
  const params       = useSearchParams();
  const nextUrl      = params.get("next") ?? "/dashboard";
  const defaultMode  = params.get("mode") === "signup" ? "signup" : "login";

  const [mode, setMode]         = useState<"login" | "signup">(defaultMode);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        setSuccess("Account created! Check your email to confirm, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(nextUrl);
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} className="mesh-bg">
      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, var(--violet), #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 24px var(--violet-glow)" }}>
              <Activity size={22} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 22 }}>
              Neat<span className="gradient-text">Healer</span>
            </span>
          </Link>
          <p style={{ marginTop: 12, color: "var(--text-secondary)", fontSize: 15 }}>
            {mode === "login" ? "Welcome back — sign in to your dashboard." : "Create your account and start monitoring."}
          </p>
        </div>

        {/* Card */}
        <div className="glass" style={{ padding: 32 }}>
          {/* Mode tabs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 28, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 4 }}>
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                style={{
                  padding: "10px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontWeight: 600, fontSize: 14, transition: "all 0.2s",
                  background: mode === m ? "rgba(124,58,237,0.25)" : "transparent",
                  color: mode === m ? "var(--violet-light)" : "var(--text-muted)",
                }}
              >
                {m === "login" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {mode === "signup" && (
              <div>
                <label htmlFor="name">Full name</label>
                <input id="name" className="input" type="text" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}

            <div>
              <label htmlFor="email">Email address</label>
              <input id="email" className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div>
              <label htmlFor="password">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="password" className="input" type={showPw ? "text" : "password"}
                  placeholder={mode === "signup" ? "Min. 8 characters" : "••••••••"}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  minLength={mode === "signup" ? 8 : 1} required
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error   && <p style={{ color: "var(--rose)",   fontSize: 13, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 8, padding: "10px 14px" }}>{error}</p>}
            {success && <p style={{ color: "var(--emerald)", fontSize: 13, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "10px 14px" }}>{success}</p>}

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
              {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : null}
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--text-muted)" }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} style={{ background: "none", border: "none", color: "var(--violet-light)", cursor: "pointer", fontWeight: 600 }}>
            {mode === "login" ? "Sign up free" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }} className="mesh-bg">
        <Loader2 size={36} color="var(--violet)" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

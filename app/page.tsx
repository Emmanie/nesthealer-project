"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Shield, Zap, Activity, RefreshCw, Bell, Key,
  ArrowRight, CheckCircle, ChevronDown, Globe,
  TrendingUp, Lock, Code, Cpu
} from "lucide-react";

// ── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? "rgba(7,7,20,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        transition: "all 0.3s",
        padding: "0 20px",
      }}
    >
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, var(--violet), #38bdf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px var(--violet-glow)"
          }}>
            <Activity size={18} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, color: "var(--text-primary)" }}>
            Neat<span className="gradient-text">Healer</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }} className="desktop-nav">
          {["Features", "How it Works", "Pricing"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/ /g, "-")}`}
              style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none", fontWeight: 500, transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
            >
              {item}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/login" className="btn-secondary" style={{ padding: "8px 18px", fontSize: 14 }}>
            Sign in
          </Link>
          <Link href="/login?mode=signup" className="btn-primary" style={{ padding: "8px 18px", fontSize: 14 }}>
            Get started free
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="mesh-bg" style={{ paddingTop: 120, paddingBottom: 100, textAlign: "center", position: "relative", overflow: "hidden" }}>
      {/* Glow orbs */}
      <div style={{ position: "absolute", top: "20%", left: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.15), transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "30%", right: "10%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.1), transparent 70%)", pointerEvents: "none" }} />

      <div className="container" style={{ position: "relative" }}>
        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 20, marginBottom: 32 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--emerald)", boxShadow: "0 0 8px var(--emerald)" }} />
          <span style={{ fontSize: 13, color: "var(--violet-light)", fontWeight: 500 }}>AI-Powered • Multi-Tenant • Always On</span>
        </div>

        <h1 style={{ fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 24, letterSpacing: "-0.03em" }}>
          Your Websites,{" "}
          <span className="gradient-text">Always Online</span>
        </h1>

        <p style={{ fontSize: "clamp(16px, 2.5vw, 20px)", color: "var(--text-secondary)", maxWidth: 640, margin: "0 auto 40px", lineHeight: 1.7 }}>
          NeatHealer monitors your sites in real-time, detects incidents, and uses AI to repair them automatically — before your users notice anything is wrong.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", marginBottom: 64 }}>
          <Link href="/login?mode=signup" className="btn-primary" style={{ fontSize: 16, padding: "14px 32px" }}>
            Start monitoring free <ArrowRight size={16} />
          </Link>
          <a href="#how-it-works" className="btn-secondary" style={{ fontSize: 16, padding: "14px 32px" }}>
            See how it works
          </a>
        </div>

        {/* Fake dashboard preview */}
        <div className="glass glass-violet animate-float" style={{ maxWidth: 780, margin: "0 auto", padding: 24, borderRadius: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--rose)" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--amber)" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--emerald)" }} />
            <span style={{ marginLeft: 12, fontSize: 12, color: "var(--text-muted)" }}>dashboard.neathealer.app</span>
          </div>
          {/* Stat row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Sites", value: "8", color: "var(--violet-light)" },
              { label: "Healthy", value: "7", color: "var(--emerald)" },
              { label: "Incidents", value: "1", color: "var(--rose)" },
              { label: "Uptime", value: "99.8%", color: "var(--sky)" },
            ].map((stat) => (
              <div key={stat.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>
          {/* Site rows */}
          {[
            { name: "api.acme.com", status: "active", latency: "42ms" },
            { name: "shop.acme.com", status: "error", latency: "—" },
            { name: "docs.acme.com", status: "active", latency: "88ms" },
          ].map((site) => (
            <div key={site.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: site.status === "active" ? "var(--emerald)" : "var(--rose)", boxShadow: `0 0 8px ${site.status === "active" ? "var(--emerald)" : "var(--rose)"}` }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{site.name}</span>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{site.latency}</span>
                <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: site.status === "active" ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)", color: site.status === "active" ? "var(--emerald)" : "var(--rose)", fontWeight: 600 }}>
                  {site.status === "active" ? "HEALTHY" : "AUTO-REPAIRING"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Activity, title: "Real-Time Monitoring", desc: "HTTP checks every 30 seconds per site. Instant detection of downtime, slow responses, and HTTP errors.", color: "var(--violet)" },
  { icon: Cpu, title: "AI Auto-Repair", desc: "Multi-provider AI (OpenAI, Claude, DeepSeek, Gemini) decides the best action: repair, restart, or rollback.", color: "var(--sky)" },
  { icon: Shield, title: "Circuit Breakers", desc: "After 3 consecutive failures the circuit opens for 60 seconds, preventing action storms and feedback loops.", color: "var(--emerald)" },
  { icon: RefreshCw, title: "Instant Rollback", desc: "Every config change is backed up. One command restores the last known-good state in seconds.", color: "var(--amber)" },
  { icon: Bell, title: "Smart Alerts", desc: "Configurable Slack, email, and webhook notifications. Get alerted only when it matters.", color: "var(--rose)" },
  { icon: TrendingUp, title: "SLA Analytics", desc: "MTTR charts, auto-repair success rates, and incident history — all in a beautiful mobile-first dashboard.", color: "var(--violet-light)" },
];

function Features() {
  return (
    <section id="features" style={{ padding: "100px 20px" }}>
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 16 }}>
            Everything you need to stay{" "}
            <span className="gradient-text-emerald">online</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 17, maxWidth: 560, margin: "0 auto" }}>
            A complete self-healing stack — no DevOps team required.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="glass" style={{ padding: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `${f.color}22`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                <f.icon size={22} color={f.color} />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 10 }}>{f.title}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How it Works ─────────────────────────────────────────────────────────────
const STEPS = [
  { num: "01", title: "Add your websites", desc: "Paste a URL or import a CSV. NeatHealer starts monitoring immediately — no agents, no code changes." },
  { num: "02", title: "AI detects & decides", desc: "Every 30 seconds, the orchestration engine checks each site. On failure, your chosen AI provider picks the optimal action." },
  { num: "03", title: "Auto-repair runs", desc: "The action executes automatically: repair, restart, rollback, or kill. You get notified and SLA metrics are logged." },
];

function HowItWorks() {
  return (
    <section id="how-it-works" style={{ padding: "100px 20px", background: "rgba(255,255,255,0.01)" }}>
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 16 }}>
            How it <span className="gradient-text">works</span>
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 40, maxWidth: 900, margin: "0 auto" }}>
          {STEPS.map((step, i) => (
            <div key={step.num} style={{ textAlign: "center", position: "relative" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg, var(--violet), var(--violet-dark))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 20, fontWeight: 900, color: "white", boxShadow: "0 8px 24px var(--violet-glow)" }}>
                {step.num}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ position: "absolute", top: 28, left: "calc(50% + 40px)", right: "calc(-50% + 40px)", height: 1, background: "linear-gradient(90deg, var(--violet), transparent)", display: "none" }} />
              )}
              <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 10 }}>{step.title}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ──────────────────────────────────────────────────────────────────
const PLANS = [
  { name: "Basic", price: 0, sites: 1, features: ["1 monitored site", "30s check interval", "AI auto-repair", "Email alerts", "SLA dashboard"], highlighted: false },
  { name: "Premium", price: 19, sites: 3, features: ["3 monitored sites", "30s check interval", "AI auto-repair", "Slack + email + webhook", "SLA analytics", "Batch CSV import"], highlighted: true },
  { name: "Enterprise", price: 49, sites: 10, features: ["10 monitored sites", "30s check interval", "Priority AI decisions", "All alert channels", "Admin panel", "Custom API keys"], highlighted: false },
  { name: "Unlimited", price: null, sites: 999999, features: ["Unlimited sites", "Custom check interval", "Dedicated support", "White-label option", "SLA guarantee", "Custom integrations"], highlighted: false },
];

function Pricing() {
  return (
    <section id="pricing" style={{ padding: "100px 20px" }}>
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 16 }}>
            Simple, transparent <span className="gradient-text">pricing</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 17 }}>Start free. Upgrade when you grow.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24, alignItems: "start" }}>
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="glass"
              style={{
                padding: 28,
                border: plan.highlighted ? "1px solid rgba(124,58,237,0.5)" : undefined,
                boxShadow: plan.highlighted ? "0 0 40px var(--violet-glow)" : undefined,
                position: "relative",
                transform: plan.highlighted ? "scale(1.03)" : undefined,
              }}
            >
              {plan.highlighted && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, var(--violet), #38bdf8)", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, color: "white", whiteSpace: "nowrap" }}>
                  Most Popular
                </div>
              )}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{plan.name}</h3>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  {plan.price === null ? (
                    <span style={{ fontSize: 28, fontWeight: 900 }}>Custom</span>
                  ) : (
                    <>
                      <span style={{ fontSize: 40, fontWeight: 900 }}>${plan.price}</span>
                      <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>/mo</span>
                    </>
                  )}
                </div>
              </div>
              <ul style={{ listStyle: "none", marginBottom: 28, display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--text-secondary)" }}>
                    <CheckCircle size={14} color="var(--emerald)" style={{ flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.price === null ? "mailto:hello@neathealer.app" : "/login?mode=signup"}
                className={plan.highlighted ? "btn-primary" : "btn-secondary"}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {plan.price === 0 ? "Get started free" : plan.price === null ? "Contact sales" : `Start for $${plan.price}/mo`}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA Banner ────────────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <section style={{ padding: "80px 20px" }}>
      <div className="container">
        <div className="glass glass-violet" style={{ padding: "60px 40px", textAlign: "center", borderRadius: 20, background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(56,189,248,0.06))" }}>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 40px)", fontWeight: 800, marginBottom: 16 }}>
            Ready to never worry about downtime again?
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 17, marginBottom: 36, maxWidth: 480, margin: "0 auto 36px" }}>
            Join hundreds of teams who trust NeatHealer to keep their sites running automatically.
          </p>
          <Link href="/login?mode=signup" className="btn-primary" style={{ fontSize: 16, padding: "14px 36px" }}>
            Start free — no credit card needed <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ padding: "40px 20px", borderTop: "1px solid var(--border)" }}>
      <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, var(--violet), #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={14} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>NeatHealer</span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["Privacy", "Terms", "API Docs", "Status"].map((item) => (
            <a key={item} href="#" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>{item}</a>
          ))}
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>© 2026 NeatHealer. All rights reserved.</p>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <CTABanner />
      <Footer />
    </main>
  );
}

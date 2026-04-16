"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, BarChart2, Settings, ShieldCheck, FileText, LogOut, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

const NAV_ITEMS = [
  { id: "dashboard",  href: "/dashboard",  icon: LayoutDashboard, label: "Dashboard" },
  { id: "playbooks",  href: "/playbooks",  icon: BookOpen,        label: "Playbooks" },
  { id: "analytics",  href: "/analytics",  icon: BarChart2,       label: "Analytics" },
  { id: "settings",   href: "/settings",   icon: Settings,        label: "Settings"  },
  { id: "admin",      href: "/admin",      icon: ShieldCheck,     label: "Admin"     },
  { id: "api-docs",   href: "/api-docs",   icon: FileText,        label: "API Docs"  },
];

export default function MobileNav({ active }: { active: string }) {
  const router   = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────── */}
      <aside style={{
        width: 220, flexShrink: 0, padding: "24px 16px",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh",
        zIndex: 100, background: "var(--bg-dark)",
      }} className="desktop-sidebar">
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36, padding: "0 8px" }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, var(--violet), #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LayoutDashboard size={16} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16 }}>NeatHealer</span>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_ITEMS.map(({ id, href, icon: Icon, label }) => {
            const isActive = active === id;
            return (
              <Link
                key={id}
                href={href}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px", borderRadius: 10, textDecoration: "none",
                  fontWeight: 500, fontSize: 14, transition: "all 0.15s",
                  background: isActive ? "rgba(124,58,237,0.2)" : "transparent",
                  color: isActive ? "var(--violet-light)" : "var(--text-secondary)",
                  borderLeft: isActive ? "2px solid var(--violet)" : "2px solid transparent",
                }}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>

        <button onClick={handleSignOut} className="btn-ghost" style={{ width: "100%", justifyContent: "flex-start", gap: 10, padding: "10px 12px", color: "var(--rose)" }}>
          <LogOut size={16} /> Sign out
        </button>
      </aside>

      {/* ── Mobile bottom tab bar ─────────────────────────── */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 90,
        background: "rgba(7,7,20,0.96)", backdropFilter: "blur(20px)",
        borderTop: "1px solid var(--border)",
        display: "flex", justifyContent: "space-around", alignItems: "center",
        padding: "8px 0 max(8px, env(safe-area-inset-bottom))",
        height: "calc(64px + max(0px, env(safe-area-inset-bottom)))",
      }} className="mobile-nav">
        {NAV_ITEMS.map(({ id, href, icon: Icon, label }) => {
          const isActive = active === id;
          return (
            <Link key={id} href={href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, textDecoration: "none", minWidth: 46, padding: "4px" }}>
              <Icon size={18} color={isActive ? "var(--violet-light)" : "var(--text-muted)"} />
              <span style={{ fontSize: 9, fontWeight: 600, color: isActive ? "var(--violet-light)" : "var(--text-muted)", textAlign: "center" }}>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Responsive CSS ───────────────────────────────── */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-nav { display: flex !important; }
          .desktop-nav { display: none !important; }
        }
        @media (min-width: 769px) {
          .desktop-sidebar { display: flex !important; }
          .mobile-nav { display: none !important; }
        }
      `}</style>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";
import Script    from "next/script";

export default function ApiDocsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (process.env.NODE_ENV === "production" && !process.env.DEBUG_API_DOCS) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <h1 style={{ fontWeight: 800, fontSize: 24 }}>API Docs</h1>
        <p style={{ color: "var(--text-secondary)" }}>API documentation is only available in development mode.</p>
      </div>
    );
  }

  // To prevent hydration mismatch, we must render the SAME thing on server and first client render.
  // We only render the heavy Scalar container after the component has "mounted" on the client.
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#070714" }}>
      <MobileNav active="api-docs" />
      
      <main style={{ flex: 1, position: "relative", overflow: "hidden" }} suppressHydrationWarning>
        {mounted ? (
          <>
            {/* Custom Styling to override Scalar with NeatHealer's aesthetics */}
            <style dangerouslySetInnerHTML={{ __html: `
              :root {
                --scalar-font-family: 'Inter', system-ui, sans-serif;
                --scalar-color-1: var(--text-primary);
                --scalar-color-2: var(--text-secondary);
                --scalar-color-3: var(--text-muted);
                --scalar-color-accent: var(--violet);
                --scalar-background-1: #070714;
                --scalar-background-2: rgba(255, 255, 255, 0.03);
                --scalar-background-3: rgba(255, 255, 255, 0.05);
                --scalar-border-color: var(--border);
                --scalar-button-1: var(--violet);
                --scalar-button-1-color: white;
                --scalar-radius: 12px;
                --scalar-radius-lg: 16px;
              }

              .scalar-api-reference .sidebar {
                background: rgba(7, 7, 20, 0.6) !important;
                backdrop-filter: blur(10px) !important;
                border-right: 1px solid var(--border) !important;
              }

              .scalar-api-reference .footer-branding { display: none !important; }
              .scalar-api-reference ::-webkit-scrollbar { width: 6px; height: 6px; }
              .scalar-api-reference ::-webkit-scrollbar-thumb { background: rgba(124, 58, 237, 0.2); border-radius: 10px; }
              .scalar-api-reference ::-webkit-scrollbar-thumb:hover { background: var(--violet); }
            `}} />

            <Script 
              src="https://cdn.jsdelivr.net/npm/@scalar/api-reference" 
              strategy="afterInteractive"
              onLoad={() => {
                // @ts-ignore
                if (window.Scalar) {
                  // @ts-ignore
                  window.Scalar.createApiReference(document.querySelector('#api-reference-container'), {
                    spec: { url: '/openapi.json' },
                    theme: 'purple',
                    showSidebar: true,
                    layout: 'modern',
                    darkMode: true,
                  });
                }
              }}
            />

            <div id="api-reference-container" style={{ height: "100vh", width: "100%" }}>
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                <div style={{ textAlign: "center" }}>
                  <div className="spin" style={{ width: 40, height: 40, border: "4px solid rgba(124, 58, 237, 0.1)", borderTop: "4px solid var(--violet)", borderRadius: "50%", margin: "0 auto 16px" }}></div>
                  <p style={{ fontSize: 14 }}>Chargement de l'interface API...</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* This simple div must match exactly what the server renders initially */
          <div style={{ flex: 1, background: "#070714" }} />
        )}
      </main>
    </div>
  );
}


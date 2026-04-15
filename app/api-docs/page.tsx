"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";

// Only load swagger-ui-react on the client (it uses browser APIs)
const SwaggerUI = dynamic(() => import("swagger-ui-react").then((m) => m.default), { ssr: false });

export default function ApiDocsPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <h1 style={{ fontWeight: 800, fontSize: 24 }}>API Docs</h1>
        <p style={{ color: "var(--text-secondary)" }}>API documentation is only available in development mode.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <MobileNav active="api-docs" />
      <main style={{ flex: 1 }}>
        <style>{`
          /* Dark-theme overrides for Swagger UI */
          .swagger-ui { background: var(--bg-primary); color: var(--text-primary); }
          .swagger-ui .info .title { color: var(--text-primary); }
          .swagger-ui .opblock { background: var(--bg-card); border-color: var(--border); border-radius: 8px; margin-bottom: 8px; }
          .swagger-ui .opblock:hover { border-color: var(--border-hover); }
          .swagger-ui .opblock-summary { background: transparent; }
          .swagger-ui .opblock-summary-path { color: var(--text-primary) !important; }
          .swagger-ui .opblock-summary-description { color: var(--text-secondary); }
          .swagger-ui section.models { display: none; }
          .swagger-ui .topbar { display: none; }
          .swagger-ui .info { padding: 20px 0; }
          .swagger-ui .scheme-container { background: var(--bg-secondary); border: 1px solid var(--border); }
        `}</style>
        <SwaggerUI url="/openapi.json" docExpansion="list" />
      </main>
    </div>
  );
}

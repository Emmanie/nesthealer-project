import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow swagger-ui-react images
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },

  async headers() {
    return [
      {
        source: "/api/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin",  value: process.env.NEXT_PUBLIC_APP_URL ?? "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },

  // Exclude server-only modules from the client bundle
  serverExternalPackages: ["crypto"],
};

export default nextConfig;

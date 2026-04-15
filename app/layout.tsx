import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NeatHealer — Self-Healing Website Control Center",
    template: "%s | NeatHealer",
  },
  description:
    "Monitor websites in real-time, auto-repair incidents with AI, and stay online 24/7. Multi-tenant SaaS with circuit breakers, rollback, and SLA analytics.",
  keywords: [
    "website monitoring",
    "self-healing",
    "uptime",
    "SLA",
    "auto-repair",
    "AI monitoring",
  ],
  openGraph: {
    title: "NeatHealer — Self-Healing Website Control Center",
    description:
      "AI-powered website monitoring that detects and fixes issues automatically.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased bg-bg-primary text-text-primary min-h-screen">
        {children}
      </body>
    </html>
  );
}

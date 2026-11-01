import type { Metadata, Viewport } from "next";
import { ConnectionStatus } from "@/components/connection-status";
import "./globals.css";

// Request-specific CSP nonces require server rendering, including public auth pages.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Fitness RPG", template: "%s | Fitness RPG" },
  description: "Private training and progression for two.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fitness RPG",
  },
  icons: { apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f5f3",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <span className="brand">Fitness RPG</span>
          <span className="tag">Private workspace</span>
        </header>
        <ConnectionStatus />
        {children}
      </body>
    </html>
  );
}

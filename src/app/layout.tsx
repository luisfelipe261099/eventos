import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/standard.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VipFlow", template: "%s · VipFlow" },
  description: "Gestão inteligente, check-in ultrarrápido, cardápio digital e IA para casas de eventos e bares.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, title: "VipFlow", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#000000", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

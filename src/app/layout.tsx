import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/standard.css";
import "./globals.css";

const DESCRIPTION = "Ingressos, portaria, cardápio e comandas em um sistema só. Metade da taxa das ticketeiras e o dinheiro na sua chave Pix quando você quiser.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: { default: "Casa Cheia", template: "%s · Casa Cheia" },
  description: DESCRIPTION,
  // prévia do link no WhatsApp e nas redes; páginas de evento trocam a imagem pelo flyer
  openGraph: { type: "website", siteName: "Casa Cheia", locale: "pt_BR", title: "Casa Cheia: metade da taxa, dinheiro na hora", description: DESCRIPTION, images: [{ url: "/og.png", width: 1200, height: 630, alt: "Casa Cheia: metade da taxa, dinheiro na hora" }] },
  twitter: { card: "summary_large_image", title: "Casa Cheia: metade da taxa, dinheiro na hora", description: DESCRIPTION, images: ["/og.png"] },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, title: "Casa Cheia", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#000000", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

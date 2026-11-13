import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // inclui os arquivos SQL em todas as funções: as tabelas são criadas e atualizadas no primeiro acesso
  outputFileTracingIncludes: { "/**": ["./supabase/migrations/*.sql"] },
  serverExternalPackages: ["postgres"],
  // endereços antigos da Vercel → endereço oficial (a API fica de fora: webhooks já cadastrados não seguem redirecionamento)
  async redirects() {
    return ["eventos-ashy-alpha.vercel.app", "vipflowapp.vercel.app"].map((host) => ({
      source: "/:path((?!api/).*)",
      has: [{ type: "host" as const, value: host }],
      destination: "https://casacheiaapp.vercel.app/:path",
      permanent: true,
    }));
  },
  async headers() {
    return [{
      // link para baixar o vídeo de apresentação (o celular salva em vez de só tocar)
      source: "/video/casa-cheia-baixar.mp4",
      headers: [{ key: "Content-Disposition", value: 'attachment; filename="casa-cheia.mp4"' }],
    }, {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" }, // o simulador usa iframes do próprio site
        { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
      ],
    }];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};
export default nextConfig;

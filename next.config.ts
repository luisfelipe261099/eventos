import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // inclui os arquivos SQL na função de configuração (/api/admin/setup)
  outputFileTracingIncludes: { "/api/admin/setup": ["./supabase/migrations/*.sql"] },
  serverExternalPackages: ["postgres"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};
export default nextConfig;

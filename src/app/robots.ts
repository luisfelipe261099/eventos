import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return {
    rules: [{ userAgent: "*", allow: ["/", "/e/"], disallow: ["/admin", "/api", "/portaria", "/bar", "/promoter", "/ingresso", "/comanda", "/conta", "/simular"] }],
    sitemap: base ? `${base}/sitemap.xml` : undefined,
  };
}

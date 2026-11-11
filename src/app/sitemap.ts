import type { MetadataRoute } from "next";
import { upcomingShowcase } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const events = await upcomingShowcase().catch(() => []);
  return [{ url: `${base}/`, changeFrequency: "daily", priority: 1 }, { url: `${base}/planos`, changeFrequency: "monthly", priority: 0.9 }, { url: `${base}/cadastro`, changeFrequency: "monthly", priority: 0.7 }, ...events.map((e) => ({ url: `${base}/e/${e.slug}`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.8 }))];
}

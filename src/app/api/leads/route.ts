import { body, fail, handle, ok } from "@/lib/http";
import { db, uid } from "@/lib/db";
import { attempts, registerAttempt } from "@/lib/rate-limit";
import type { Lead } from "@/lib/types";

/** "Quero que me liguem": contato deixado na página de planos. */
export const POST = handle(async (req: Request) => {
  const ip = `lead:${(req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim()}`;
  if ((await attempts(ip, 60)) >= 5) return fail("Recebemos seu contato. Aguarde nosso retorno.", 429);
  const b = await body<{ name: string; venue?: string; phone: string; city?: string; plan?: string }>(req);
  if (!b.name?.trim() || (b.phone ?? "").replace(/\D/g, "").length < 10) return fail("Informe seu nome e o WhatsApp com DDD.");
  await registerAttempt(ip);
  const cut = (s: string | undefined, n: number) => (s ?? "").trim().slice(0, n);
  await db().insert<Lead>("leads", { id: uid(), name: cut(b.name, 80), venue_name: cut(b.venue, 80), phone: cut(b.phone, 30), city: cut(b.city, 60), plan: cut(b.plan, 20), created_at: new Date().toISOString() });
  return ok({ ok: true });
});

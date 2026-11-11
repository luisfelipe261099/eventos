import { NextResponse } from "next/server";
import { body, fail, handle } from "@/lib/http";
import { hashPassword, sessionCookie } from "@/lib/admin-auth";
import { db, isSupabaseConfigured, uid } from "@/lib/db";
import { freeVenueSlug } from "@/lib/admin-ops";
import { venueRawByEmail } from "@/lib/repo";
import { PLANS, TRIAL_DAYS, DEFAULT_PLAN } from "@/lib/plans";
import { attempts, registerAttempt } from "@/lib/rate-limit";
import { runMigrations } from "@/lib/setup";
import type { Venue } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Cadastro de uma casa nova: cria a conta, começa o período grátis e já entra no painel. */
export const POST = handle(async (req: Request) => {
  if (!isSupabaseConfigured()) return fail("O cadastro abre quando o banco de dados estiver conectado. Por enquanto, explore a demonstração.", 503);
  const ip = `signup:${(req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim()}`;
  if ((await attempts(ip, 60)) >= 5) return fail("Muitos cadastros deste endereço. Tente de novo em uma hora.", 429);
  const b = await body<{ venue: string; city?: string; name: string; email: string; phone: string; password: string; plan?: string }>(req);
  const email = (b.email ?? "").trim().toLowerCase();
  if (!b.venue?.trim() || !b.name?.trim()) return fail("Informe o nome da casa e o seu nome.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Informe um e-mail válido.");
  if ((b.phone ?? "").replace(/\D/g, "").length < 10) return fail("Informe o WhatsApp com DDD.");
  if ((b.password ?? "").length < 8) return fail("A senha precisa de pelo menos 8 caracteres.");
  let existing: Venue | null;
  try { existing = await venueRawByEmail(email); }
  catch { await runMigrations(); existing = await venueRawByEmail(email); } // primeira casa da instalação: cria as tabelas
  if (existing) return fail("Já existe uma casa com este e-mail. Entre pelo painel.", 409);
  await registerAttempt(ip);
  const plan = PLANS.find((p) => p.id === b.plan)?.id ?? DEFAULT_PLAN;
  const [v] = await db().insert<Venue>("venues", {
    id: uid(), slug: await freeVenueSlug(b.venue), name: b.venue.trim(), city: (b.city ?? "").trim(), address: "", lat: 0, lng: 0, geofence_m: 80,
    owner_name: b.name.trim(), owner_email: email, owner_phone: b.phone.trim(), password_hash: hashPassword(b.password),
    plan, fee_mode: "buyer", plan_status: "trial", trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 864e5).toISOString(),
  });
  const res = NextResponse.json({ ok: true, slug: v.slug });
  const c = sessionCookie({ venueId: v.id, root: false });
  res.cookies.set(c.name, c.value, c.options);
  return res;
});

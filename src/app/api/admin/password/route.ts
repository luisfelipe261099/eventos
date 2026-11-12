import { body, fail, guardAdmin, handle, ok } from "@/lib/http";
import { getSession, hashPassword, verifyPassword } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { venueRaw } from "@/lib/repo";
import { attempts, registerAttempt } from "@/lib/rate-limit";
import type { Venue } from "@/lib/types";

export const runtime = "nodejs";

/** A casa troca a própria senha (pede a senha atual). */
export const POST = handle(async (req: Request) => {
  const denied = await guardAdmin(); if (denied) return denied;
  const s = await getSession();
  if (!s?.venueId || s.root) return fail("Entre com o e-mail e a senha da casa para trocar a senha.", 403);
  const key = `pw:${s.venueId}`;
  if ((await attempts(key, 15)) >= 8) return fail("Muitas tentativas. Aguarde 15 minutos.", 429);
  const b = await body<{ current: string; next: string }>(req);
  if ((b.next ?? "").length < 8) return fail("A senha nova precisa de pelo menos 8 caracteres.");
  const v = await venueRaw(s.venueId);
  if (!v || !verifyPassword(b.current ?? "", v.password_hash)) { await registerAttempt(key); return fail("A senha atual não confere.", 401); }
  await db().update<Venue>("venues", v.id, { password_hash: hashPassword(b.next) });
  return ok({ ok: true });
});

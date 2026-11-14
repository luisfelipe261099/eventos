import { NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "node:crypto";
import { body } from "@/lib/http";
import { COOKIE, sessionCookie, verifyPassword, type Session } from "@/lib/admin-auth";
import { isSupabaseConfigured } from "@/lib/db";
import { venueRawByEmail } from "@/lib/repo";
import { attempts, clearAttempts, registerAttempt } from "@/lib/rate-limit";

export const runtime = "nodejs";
const MAX = 8, WINDOW_MIN = 15;
const same = (a: string, b: string) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

/**
 * Login do painel, com limite de tentativas por IP (contra força bruta).
 * - e-mail + senha: a casa entra no próprio painel.
 * - só a senha (ADMIN_PASSWORD): a Casa Cheia entra como plataforma.
 */
export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const { email, password } = await body<{ email?: string; password: string }>(req);
  const target = email?.trim() ? `email:${email.trim().toLowerCase()}` : "root";
  // três contadores: o IP contra este alvo, o IP no total (não zera ao acertar outra conta) e o alvo no total
  const keys = { pair: `${ip}|${target}`, ip: `ip:${ip}`, target: `alvo:${target}` };
  const [nPair, nIp, nTarget] = await Promise.all([attempts(keys.pair, WINDOW_MIN), attempts(keys.ip, WINDOW_MIN), attempts(keys.target, WINDOW_MIN)]);
  if (nPair >= MAX || nIp >= MAX * 3 || nTarget >= MAX * 5) return NextResponse.json({ error: `Muitas tentativas. Aguarde ${WINDOW_MIN} minutos.` }, { status: 429 });
  let session: Session | null = null;
  if (typeof password === "string" && password) {
    if (email?.trim() && isSupabaseConfigured()) {
      const v = await venueRawByEmail(email).catch(() => null);
      if (v && verifyPassword(password, v.password_hash)) session = { venueId: v.id, root: false };
    } else {
      const pw = process.env.ADMIN_PASSWORD;
      if (pw && same(password, pw)) session = { venueId: null, root: true };
    }
  }
  if (!session) {
    await Promise.all([registerAttempt(keys.pair), registerAttempt(keys.ip), registerAttempt(keys.target)]);
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: email?.trim() ? "E-mail ou senha incorretos" : "Senha incorreta" }, { status: 401 });
  }
  await clearAttempts(keys.pair); // só o par IP + esta conta; os outros contadores expiram sozinhos
  const res = NextResponse.json({ ok: true, root: session.root });
  const c = sessionCookie(session);
  res.cookies.set(c.name, c.value, c.options);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

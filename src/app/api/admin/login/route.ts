import { NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "node:crypto";
import { body } from "@/lib/http";
import { COOKIE, tokenFor } from "@/lib/admin-auth";
import { pg, postgresUrl } from "@/lib/db";

export const runtime = "nodejs";
const MAX = 8, WINDOW_MIN = 15;
const mem = new Map<string, number[]>();

async function attempts(ip: string): Promise<number> {
  if (postgresUrl()) {
    const [r] = await pg()`select count(*)::int as n from login_attempts where ip = ${ip} and at > now() - make_interval(mins => ${WINDOW_MIN})`.catch(() => [{ n: 0 }]);
    return r?.n ?? 0;
  }
  const now = Date.now(); const list = (mem.get(ip) ?? []).filter((t) => now - t < WINDOW_MIN * 60_000); mem.set(ip, list); return list.length;
}
async function fail(ip: string) {
  if (postgresUrl()) await pg()`insert into login_attempts (ip) values (${ip})`.catch(() => {});
  else mem.set(ip, [...(mem.get(ip) ?? []), Date.now()]);
}
async function clear(ip: string) {
  if (postgresUrl()) await pg()`delete from login_attempts where ip = ${ip} or at < now() - interval '1 day'`.catch(() => {});
  else mem.delete(ip);
}
const same = (a: string, b: string) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

/** Login do painel com limite de tentativas por IP (contra força bruta). */
export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if ((await attempts(ip)) >= MAX) return NextResponse.json({ error: `Muitas tentativas. Aguarde ${WINDOW_MIN} minutos.` }, { status: 429 });
  const { password } = await body<{ password: string }>(req);
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || typeof password !== "string" || !same(password, pw)) {
    await fail(ip);
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }
  await clear(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await tokenFor(pw), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

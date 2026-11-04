import { NextResponse } from "next/server";
import { body } from "@/lib/http";
import { COOKIE, tokenFor } from "@/lib/admin-auth";

export async function POST(req: Request) {
  const { password } = await body<{ password: string }>(req);
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || password !== pw) return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await tokenFor(pw), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 });
  return res;
}

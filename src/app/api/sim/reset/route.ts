import { NextResponse } from "next/server";
import { SIM_COOKIE } from "@/lib/db";

/** Recomeça a simulação do visitante (apaga as ações guardadas no cookie). */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SIM_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

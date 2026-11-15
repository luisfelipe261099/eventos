import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/admin-auth";

/** Sair (formulário): apaga a sessão e volta para a página de entrada. */
export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/entrar", req.url), 303);
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

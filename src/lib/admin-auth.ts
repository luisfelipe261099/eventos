import { cookies } from "next/headers";

/** Proteção simples do painel enquanto o login do Supabase não é ativado. */
export const COOKIE = "vf_admin";

export async function tokenFor(password: string) {
  const data = new TextEncoder().encode(`vipflow:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isAdmin(): Promise<boolean> {
  const { isSupabaseConfigured } = await import("./db");
  if (!isSupabaseConfigured()) return true; // modo demo/simulação: aberto a quem estiver apresentando
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return true; // produção sem senha: a tela de configuração avisa
  const c = (await cookies()).get(COOKIE)?.value;
  return c === (await tokenFor(pw));
}

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Sessão do painel. Cada casa entra com e-mail e senha; a Casa Cheia (plataforma)
 * entra com a ADMIN_PASSWORD e pode abrir o painel de qualquer casa.
 * O cookie é "tipo.casa.validade.assinatura" (HMAC), sem estado no servidor.
 */
export const COOKIE = "vf_admin";
const DAYS = 14;

/**
 * Segredo que assina as sessões e cifra as chaves do Asaas das casas.
 * Nunca deriva da ADMIN_PASSWORD: um cookie assinado permitiria testar a senha fora do ar.
 * Ordem: SESSION_SECRET; o segredo JWT que a integração Supabase da Vercel cria (aleatório, nunca exposto);
 * fora de produção, um valor fixo de desenvolvimento. Trocar o segredo invalida as chaves do Asaas já salvas.
 */
const rawSecret = () => {
  const s = process.env.SESSION_SECRET || process.env.SUPABASE_JWT_SECRET;
  if (s && s.length >= 24) return s;
  if (process.env.VERCEL_ENV === "production" && (process.env.POSTGRES_URL || process.env.DATABASE_URL)) {
    throw new Error("Configure SESSION_SECRET (24+ caracteres) nas variáveis da Vercel.");
  }
  return "casa-cheia-desenvolvimento";
};
const secret = () => createHash("sha256").update(`vipflow:${rawSecret()}`).digest();

export interface Session { venueId: string | null; root: boolean }

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function sessionToken(s: Session): string {
  const payload = `${s.root ? "r" : "v"}.${s.venueId ?? ""}.${Date.now() + DAYS * 864e5}`;
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined | null): Session | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payload = token.slice(0, i), mac = Buffer.from(token.slice(i + 1)), good = Buffer.from(sign(payload));
  if (mac.length !== good.length || !timingSafeEqual(mac, good)) return null;
  const [kind, venueId, exp] = payload.split(".");
  if (!(Number(exp) > Date.now())) return null;
  return { root: kind === "r", venueId: venueId || null };
}

export const sessionCookie = (s: Session) => ({
  name: COOKIE, value: sessionToken(s),
  options: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * DAYS },
});

export async function getSession(): Promise<Session | null> {
  try {
    const { cookies } = await import("next/headers");
    return readSessionToken((await cookies()).get(COOKIE)?.value);
  } catch { return null; }
}

/** Modo demonstração aberto. Em produção na Vercel, sem banco não é demo: é falha, e o painel fica fechado. */
const demo = async () => !(await import("./db")).isSupabaseConfigured() && process.env.VERCEL_ENV !== "production" || process.env.DEMO_MODE === "1";

/** Pode usar o painel, a portaria e o bar? No modo demo é aberto a quem estiver apresentando. */
export async function isAdmin(): Promise<boolean> {
  if (await demo()) return true;
  return (await getSession()) !== null;
}
/** É a Casa Cheia (dona da plataforma)? */
export async function isRoot(): Promise<boolean> {
  if (await demo()) return true;
  return (await getSession())?.root === true;
}

// ---------------- senha das casas (scrypt) ----------------
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `s1$${salt.toString("base64url")}$${scryptSync(password, salt, 32).toString("base64url")}`;
}
export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  const [v, salt, hash] = (stored ?? "").split("$");
  if (v !== "s1" || !salt || !hash) return false;
  const good = Buffer.from(hash, "base64url"), got = scryptSync(password, Buffer.from(salt, "base64url"), 32);
  return good.length === got.length && timingSafeEqual(good, got);
}

// ---------------- segredos guardados no banco (AES-256-GCM) ----------------
export function seal(plain: string): string {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", secret(), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `g1.${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${body.toString("base64url")}`;
}
export function unseal(sealed: string | null | undefined): string | null {
  const [v, iv, tag, body] = (sealed ?? "").split(".");
  if (v !== "g1" || !iv || !tag || !body) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", secret(), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(body, "base64url")), d.final()]).toString("utf8");
  } catch { return null; }
}

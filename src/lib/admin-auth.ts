import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Sessão do painel. Cada casa entra com e-mail e senha; a VipFlow (plataforma)
 * entra com a ADMIN_PASSWORD e pode abrir o painel de qualquer casa.
 * O cookie é "tipo.casa.validade.assinatura" (HMAC), sem estado no servidor.
 */
export const COOKIE = "vf_admin";
const DAYS = 14;

const secret = () => createHash("sha256")
  .update(`vipflow:${process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || process.env.POSTGRES_URL || process.env.DATABASE_URL || "demo"}`).digest();

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

const demo = async () => !(await import("./db")).isSupabaseConfigured();

/** Pode usar o painel, a portaria e o bar? No modo demo é aberto a quem estiver apresentando. */
export async function isAdmin(): Promise<boolean> {
  if (await demo()) return true;
  return (await getSession()) !== null;
}
/** É a VipFlow (dona da plataforma)? */
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

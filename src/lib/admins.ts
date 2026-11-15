/**
 * Administradores da plataforma (entram em /plataforma com e-mail e senha).
 * O primeiro acesso de um e-mail listado em PLATFORM_ADMIN_EMAILS cria a conta com a
 * senha informada; depois disso a senha passa a ser conferida normalmente.
 */
import { db, uid } from "./db";
import { hashPassword, verifyPassword } from "./admin-auth";
import type { PlatformAdmin } from "./types";

const norm = (e: string) => e.trim().toLowerCase();
const allowList = () => (process.env.PLATFORM_ADMIN_EMAILS ?? "").split(/[,;\s]+/).map(norm).filter(Boolean);

export async function findAdmin(email: string) {
  const e = norm(email);
  return (await db().select<PlatformAdmin>("platform_admins")).find((a) => norm(a.email) === e) ?? null;
}

/** Confere e-mail e senha de administrador. Devolve true se entrou. */
export async function adminLogin(email: string, password: string): Promise<boolean> {
  const a = await findAdmin(email);
  if (a) return verifyPassword(password, a.password_hash);
  if (!allowList().includes(norm(email)) || password.length < 8) return false;
  await db().insert<PlatformAdmin>("platform_admins", { id: uid(), email: norm(email), password_hash: hashPassword(password), created_at: new Date().toISOString() });
  return true; // primeiro acesso de um e-mail autorizado: a conta nasce com esta senha
}

/** Cria ou troca a senha de um administrador (só a plataforma chama). */
export async function upsertAdmin(email: string, password: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error("E-mail inválido.");
  if (password.length < 8) throw new Error("A senha precisa de pelo menos 8 caracteres.");
  const a = await findAdmin(email);
  if (a) return db().update<PlatformAdmin>("platform_admins", a.id, { password_hash: hashPassword(password) });
  const [row] = await db().insert<PlatformAdmin>("platform_admins", { id: uid(), email: norm(email), password_hash: hashPassword(password), created_at: new Date().toISOString() });
  return row;
}

export async function listAdmins() {
  return (await db().select<PlatformAdmin>("platform_admins")).map((a) => ({ id: a.id, email: a.email, created_at: a.created_at }));
}

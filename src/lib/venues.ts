/** Criação da conta de uma casa: pelo cadastro público ou por um administrador da plataforma. */
import { randomBytes } from "node:crypto";
import { db, uid } from "./db";
import { hashPassword } from "./admin-auth";
import { freeVenueSlug } from "./admin-ops";
import { venueRawByEmail } from "./repo";
import { DEFAULT_PLAN, PLANS, TRIAL_DAYS } from "./plans";
import { runMigrations } from "./setup";
import type { Venue } from "./types";

export class VenueInputError extends Error {}

export interface NewVenue { venue: string; city?: string; name: string; email: string; phone: string; password?: string; plan?: string }

/** Cria a casa com período grátis. Sem senha, gera uma provisória (devolvida uma única vez). */
export async function createVenueAccount(b: NewVenue): Promise<{ venue: Venue; password: string; generated: boolean }> {
  const email = (b.email ?? "").trim().toLowerCase();
  if (!b.venue?.trim() || !b.name?.trim()) throw new VenueInputError("Informe o nome da casa e o nome do responsável.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new VenueInputError("Informe um e-mail válido.");
  if ((b.phone ?? "").replace(/\D/g, "").length < 10) throw new VenueInputError("Informe o WhatsApp com DDD.");
  const generated = !b.password;
  const password = b.password || randomBytes(9).toString("base64url");
  if (password.length < 8) throw new VenueInputError("A senha precisa de pelo menos 8 caracteres.");
  let existing: Venue | null;
  try { existing = await venueRawByEmail(email); }
  catch { await runMigrations(); existing = await venueRawByEmail(email); } // primeira casa da instalação: cria as tabelas
  if (existing) throw new VenueInputError("Já existe uma casa com este e-mail.");
  const plan = PLANS.find((p) => p.id === b.plan)?.id ?? DEFAULT_PLAN;
  const [venue] = await db().insert<Venue>("venues", {
    id: uid(), slug: await freeVenueSlug(b.venue), name: b.venue.trim(), city: (b.city ?? "").trim(), address: "", lat: 0, lng: 0, geofence_m: 80,
    owner_name: b.name.trim(), owner_email: email, owner_phone: b.phone.trim(), password_hash: hashPassword(password),
    plan, fee_mode: "buyer", plan_status: "trial", trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 864e5).toISOString(),
  });
  return { venue, password, generated };
}

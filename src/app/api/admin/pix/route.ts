import { body, fail, guardAdmin, handle, ok } from "@/lib/http";
import { db } from "@/lib/db";
import { getVenueOrNull } from "@/lib/repo";
import { normalizePixKey } from "@/lib/payouts";
import type { Venue } from "@/lib/types";

/** A casa cadastra a chave Pix que recebe os repasses e escolhe se o repasse é automático. */
export const POST = handle(async (req: Request) => {
  const denied = await guardAdmin(); if (denied) return denied;
  const venue = await getVenueOrNull();
  if (!venue) return fail("Cadastre a casa primeiro.");
  const b = await body<{ type?: string; key?: string; auto?: boolean }>(req);
  const patch: Partial<Venue> = {};
  if (b.key !== undefined) {
    const k = normalizePixKey(b.type ?? "", b.key);
    if (!k) return fail("Chave Pix inválida. Confira o tipo e os números.");
    patch.pix_key = k.key; patch.pix_key_type = k.type;
  }
  if (typeof b.auto === "boolean") patch.payout_auto = b.auto;
  if (!Object.keys(patch).length) return fail("Nada para salvar.");
  const v = await db().update<Venue>("venues", venue.id, patch);
  return ok({ pix_key: v?.pix_key, pix_key_type: v?.pix_key_type, payout_auto: v?.payout_auto });
});

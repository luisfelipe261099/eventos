import { body, fail, guardAdmin, handle, ok } from "@/lib/http";
import { getVenueOrNull, setPromo } from "@/lib/repo";
import { db } from "@/lib/db";
import type { Product } from "@/lib/types";

export const POST = handle(async (req: Request) => {
  const denied = await guardAdmin(); if (denied) return denied;
  const b = await body<{ productId: string; promoCents: number; hours?: number }>(req);
  if (!b.productId || !(b.promoCents > 0)) return fail("Promoção inválida");
  const [venue, p] = await Promise.all([getVenueOrNull(), db().get<Product>("products", b.productId)]);
  if (!venue || !p || p.venue_id !== venue.id) return fail("Produto não encontrado.", 404);
  return ok(await setPromo(b.productId, Math.round(b.promoCents), b.hours ?? 4));
});

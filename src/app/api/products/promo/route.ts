import { body, fail, guardAdmin, handle, ok } from "@/lib/http";
import { setPromo } from "@/lib/repo";

export const POST = handle(async (req: Request) => {
  const denied = await guardAdmin(); if (denied) return denied;
  const b = await body<{ productId: string; promoCents: number; hours?: number }>(req);
  if (!b.productId || !(b.promoCents > 0)) return fail("Promoção inválida");
  return ok(await setPromo(b.productId, Math.round(b.promoCents), b.hours ?? 4));
});

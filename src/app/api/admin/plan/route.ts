import { body, fail, guardAdmin, handle, ok } from "@/lib/http";
import { db } from "@/lib/db";
import { getVenueOrNull } from "@/lib/repo";
import { subscribe, syncBilling } from "@/lib/billing";
import { PLANS, type PlanId } from "@/lib/plans";
import { PaymentError } from "@/lib/payments";
import type { Venue } from "@/lib/types";

/** A casa escolhe o plano, quem paga a taxa do ingresso e assina a mensalidade. */
export const POST = handle(async (req: Request) => {
  const denied = await guardAdmin(); if (denied) return denied;
  const venue = await getVenueOrNull();
  if (!venue) return fail("Cadastre a casa primeiro.");
  const b = await body<{ action: "fee_mode" | "subscribe"; fee_mode?: string; plan?: string; doc?: string; email?: string }>(req);
  if (b.action === "fee_mode") {
    if (b.fee_mode !== "buyer" && b.fee_mode !== "venue") return fail("Opção inválida.");
    await db().update<Venue>("venues", venue.id, { fee_mode: b.fee_mode });
    return ok({ fee_mode: b.fee_mode });
  }
  if (b.action === "subscribe") {
    const plan = PLANS.find((p) => p.id === b.plan)?.id as PlanId | undefined;
    if (!plan) return fail("Escolha um plano.");
    try {
      const r = await subscribe(venue.id, { doc: b.doc ?? venue.doc ?? "", email: b.email ?? venue.owner_email ?? "", plan });
      return ok({ ...r, ...(await syncBilling(venue.id)) });
    } catch (e) {
      if (e instanceof PaymentError) return fail(`Não foi possível criar a assinatura: ${e.message}`, 502);
      throw e;
    }
  }
  return fail("Ação inválida.");
});
